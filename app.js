const express = require('express');
const oracledb = require('oracledb');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const nodemailer = require('nodemailer');
const fs = require('fs');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const redis = require('redis');
const cluster = require('cluster');
const os = require('os');










const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET || 'Mjk4OWJlNzctYWVkYi00ZTk5LTgzMTgtNzM0MGI3ZmQ5MzBl';
const redisClient = redis.createClient();
const allowedOrigins = ['http://localhost:3000', 'https://57418ktj-3000.use2.devtunnels.ms'];
app.use(bodyParser.json());
app.use(cors({
  origin: function (origin, callback) {
      // Permitir solicitudes sin origen (como curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
          const msg = 'El CORS policy no permite acceso desde el origen especificado.';
          return callback(new Error(msg), false);
      }
      return callback(null, true);
  }
}));

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT * FROM users WHERE username = :username AND password = :password`,
      [username, password]
    );

    await connection.close();

    if (result.rows.length > 0) {
      const user = { username };
      const accessToken = jwt.sign(user, secret, { expiresIn: '1h' });
      res.json({ success: true, message: 'Login successful', accessToken });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Protege las rutas
app.use('/inventario.html', authenticateToken);
app.use('/envios.html', authenticateToken);
app.use('/proveedores.html', authenticateToken);
app.use('/clientes.html', authenticateToken);
app.use('/reportes.html', authenticateToken);
app.use('/ventas.html', authenticateToken);



app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/comprobantes', express.static(path.join(__dirname, 'public', 'comprobantes')));
app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

const dbConfig = {
  user: 'YOSTI',
  password: '123',
  connectString: 'localhost:1521/ORCLD'
};

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  async function executeQuery(query, binds = {}, options = {}, returnObjects = false) {
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      const execOptions = returnObjects ? { ...options, outFormat: oracledb.OUT_FORMAT_OBJECT } : options;
      const result = await connection.execute(query, binds, execOptions);

      if (query.trim().startsWith("INSERT") || query.trim().startsWith("UPDATE") || query.trim().startsWith("DELETE") || query.trim().startsWith("CALL")) {
        await connection.commit();
      }

      return result;
    } catch (err) {
      console.error('Query Error:', err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Closing connection error:', err);
        }
      }
    }
  }



  
 
  const cache = (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    redisClient.get(key, (err, data) => {
      if (err) throw err;
      if (data !== null) {
        res.send(JSON.parse(data));
      } else {
        res.sendResponse = res.send;
        res.send = (body) => {
          redisClient.setex(key, 3600, JSON.stringify(body));
          res.sendResponse(body);
        };
        next();
      }
    });
  };

  
  // Proteger las rutas con autenticación
  app.get('/dashboard.html', authenticateToken, csrfProtection, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

  app.get('/gestion-inventario.html', authenticateToken, csrfProtection, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gestion-inventario.html'));
  });
  app.get('/gestion-clientes.html', authenticateToken, csrfProtection, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gestion-clientes.html'));
  });




// Endpoint para agregar un nuevo cliente
app.post('/clientes', async (req, res) => {
  const { nombre, documento_identidad, telefono, correo_electronico, direccion, estado } = req.body;
  try {
    const connection = await oracledb.getConnection(dbConfig);

    // Verificar si la cédula ya está registrada
    const checkSql = 'SELECT COUNT(*) AS count FROM clientes WHERE documento_identidad = :documento_identidad';
    const checkResult = await connection.execute(checkSql, [documento_identidad]);
    const count = checkResult.rows[0][0];

    if (count > 0) {
      await connection.close();
      return res.status(400).json({ success: false, message: 'El documento de identidad ya está registrado.' });
    }
    
    // Insertar el nuevo cliente
    const sql = `
      INSERT INTO clientes (cliente_id, nombre, documento_identidad, telefono, correo_electronico, direccion, estado)
      VALUES (cliente_id_seq.NEXTVAL, :nombre, :documento_identidad, :telefono, :correo_electronico, :direccion, :estado)
    `;
    const params = [nombre, documento_identidad, telefono, correo_electronico, direccion, estado];

    const result = await connection.execute(sql, params, { autoCommit: true });
    await connection.close();
    res.json({ success: true, message: 'Cliente agregado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al agregar el cliente: ' + err.message });
  }
});


// Endpoint para obtener todos los clientes o buscar clientes
app.get('/clientes', async (req, res) => {
  const { search } = req.query;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    let result;
    if (search) {
      const lowerSearch = `%${search.toLowerCase()}%`;
      result = await connection.execute(
        `SELECT cliente_id, nombre, documento_identidad, telefono, correo_electronico, direccion, estado FROM clientes WHERE LOWER(nombre) LIKE :search OR LOWER(documento_identidad) LIKE :search`,
        { search: lowerSearch }
      );
    } else {
      result = await connection.execute(`SELECT cliente_id, nombre, documento_identidad, telefono, correo_electronico, direccion, estado FROM clientes`);
    }
    await connection.close();

    const clientes = result.rows.map(row => {
      return {
        id: row[0],
        nombre: row[1],
        documento_identidad: row[2],
        telefono: row[3],
        correo_electronico: row[4],
        direccion: row[5],
        estado: row[6]
      };
    });

   
    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener los clientes' });
  }
});


// Endpoint para obtener un cliente específico por ID
app.get('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT cliente_id, nombre, documento_identidad, telefono, correo_electronico, direccion, estado FROM clientes WHERE cliente_id = :id`, [id]);
    await connection.close();
    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        id: row[0],
        nombre: row[1],
        documento_identidad: row[2],
        telefono: row[3],
        correo_electronico: row[4],
        direccion: row[5],
        estado: row[6]
      });
    } else {
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener el cliente' });
  }
});



// Endpoint para actualizar un cliente
app.put('/clientes/:id', async (req, res) => {
  const { nombre, documento_identidad, telefono, correo_electronico, direccion, estado } = req.body;
  const { id } = req.params;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `UPDATE clientes SET nombre = :nombre, documento_identidad = :documento_identidad, telefono = :telefono, correo_electronico = :correo_electronico, direccion = :direccion, estado = :estado WHERE cliente_id = :id`,
      [nombre, documento_identidad, telefono, correo_electronico, direccion, estado, id],
      { autoCommit: true }
    );
    await connection.close();
    if (result.rowsAffected > 0) {
      res.json({ success: true, message: 'Cliente actualizado exitosamente' });
    } else {
      res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al actualizar el cliente' });
  }
});

// Endpoint para eliminar un cliente y sus registros relacionados
app.delete('/clientes/:id', async (req, res) => {
  const clienteId = req.params.id;

  try {
    console.log(`Eliminando registros relacionados del cliente ${clienteId}...`);

    // Eliminar detalles de ventas relacionados
    const deleteSaleDetailsQuery = `
      DELETE FROM DETALLE_VENTAS
      WHERE VENTA_ID IN (SELECT VENTA_ID FROM VENTAS WHERE CLIENTE_ID = :clienteId)`;
    await executeQuery(deleteSaleDetailsQuery, { clienteId });

    // Eliminar ventas relacionadas
    const deleteSalesQuery = `
      DELETE FROM VENTAS
      WHERE CLIENTE_ID = :clienteId`;
    await executeQuery(deleteSalesQuery, { clienteId });

    // Eliminar cliente
    const deleteClientQuery = `
      DELETE FROM CLIENTES
      WHERE CLIENTE_ID = :clienteId`;
    await executeQuery(deleteClientQuery, { clienteId });

    console.log(`Cliente ${clienteId} eliminado exitosamente.`);
    res.status(200).send({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error("Error al eliminar el cliente:", error);
    res.status(500).send({ message: 'Error al eliminar el cliente' });
  }
});

// Endpoint para obtener los clientes que más compran
app.get('/api/clientes-mas-compras', async (req, res) => {
  let connection;

  try {
    const { month, year } = req.query;

    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `BEGIN obtener_clientes_mas_compras_mes(:month, :year, :cursor); END;`,
      {
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const clientesMasCompras = rows.map(row => ({
      name: row[0],
      cedula: row[1],
      totalPurchases: row[2]
    }));

    res.json(clientesMasCompras);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener datos');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});













// Endpoint para obtener productos
app.get('/productos', async (req, res) => {
  const { search, id, categoria } = req.query;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    let result;
    if (id) {
      result = await connection.execute('SELECT * FROM PRODUCTOS WHERE PRODUCTO_ID = :id', [id]);
    } else if (search) {
      const lowerSearch = `%${search.toLowerCase()}%`;
      result = await connection.execute(
        `SELECT * FROM PRODUCTOS WHERE LOWER(NOMBRE) LIKE :search OR LOWER(CATEGORIA) LIKE :search`,
        { search: lowerSearch }
      );
    } else if (categoria) {
      result = await connection.execute(
        'SELECT * FROM PRODUCTOS WHERE CATEGORIA = :categoria', 
        { categoria }
      );
    } else {
      result = await connection.execute('SELECT * FROM PRODUCTOS');
    }
    await connection.close();

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener productos' });
  }
});




// Endpoint para obtener todas las categorías
app.get('/categorias', async (req, res) => {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute('SELECT DISTINCT CATEGORIA FROM PRODUCTOS');
    await connection.close();

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron categorías' });
    }

    const categorias = result.rows.map(row => row[0]);
    res.json(categorias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
});








// Endpoint para agregar un nuevo producto
app.post('/productos', async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria, stock_minimo } = req.body;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const sql = `
      INSERT INTO PRODUCTOS (NOMBRE, DESCRIPCION, PRECIO, STOCK, CATEGORIA, STOCK_MINIMO)
      VALUES (:nombre, :descripcion, :precio, :stock, :categoria, :stock_minimo)
    `;
    const params = [nombre, descripcion, precio, stock, categoria, stock_minimo];
    const result = await connection.execute(sql, params, { autoCommit: true });
    await connection.close();
    res.json({ success: true, message: 'Producto agregado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al agregar producto' });
  }
});


// Endpoint para actualizar un producto
app.put('/productos/:id', async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria, stock_minimo } = req.body;
  const { id } = req.params;
  try {
    const connection = await oracledb.getConnection(dbConfig);
    const sql = `
      UPDATE PRODUCTOS
      SET NOMBRE = :nombre, 
          DESCRIPCION = :descripcion, 
          PRECIO = :precio, 
          STOCK = :stock, 
          CATEGORIA = :categoria,
          STOCK_MINIMO = :stock_minimo
      WHERE PRODUCTO_ID = :id
    `;
    const params = { nombre, descripcion, precio: parseFloat(precio), stock: parseInt(stock), categoria, stock_minimo: parseInt(stock_minimo), id };
    const result = await connection.execute(sql, params, { autoCommit: true });
    if (result.rowsAffected > 0) {
      res.json({ success: true, message: 'Producto actualizado exitosamente' });
    } else {
      res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    await connection.close();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al actualizar el producto' });
  }
});




// Endpoint para eliminar un producto
app.delete('/productos/:id', async (req, res) => {
  const { id } = req.params;
  console.log("Intentando eliminar producto con ID:", id);
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Llamar al procedimiento almacenado
    const result = await connection.execute(
      `BEGIN
         eliminar_producto(:id);
       END;`,
      { id }
    );

    // Verificar si el producto fue eliminado
    const checkResult = await connection.execute(
      `SELECT COUNT(*) AS count FROM productos WHERE producto_id = :id`,
      { id }
    );

    const count = checkResult.rows[0][0];
    if (count === 0) {
      res.json({ success: true, message: 'Producto eliminado exitosamente' });
    } else {
      res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al eliminar producto' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error al cerrar la conexión:', closeErr);
      }
    }
  }
});


app.get('/get-products', async (req, res) => {
  try {
    const result = await executeQuery(`SELECT PRODUCTO_ID, NOMBRE, DESCRIPCION, PRECIO, STOCK FROM PRODUCTOS`);
    res.status(200).json(result.rows.map(row => ({
      PRODUCTO_ID: row[0],
      NOMBRE: row[1],
      DESCRIPCION: row[2],
      PRECIO: row[3],
      STOCK: row[4] // Incluye el stock en la respuesta
    })));
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error al obtener los productos' });
  }
});

app.get('/get-client-data', async (req, res) => {
  const { document } = req.query;

  try {
    const clientResult = await executeQuery(
      `SELECT NOMBRE, DOCUMENTO_IDENTIDAD, TELEFONO, DIRECCION, CORREO_ELECTRONICO FROM CLIENTES WHERE DOCUMENTO_IDENTIDAD = :document`,
      { document: document }
    );

    if (clientResult.rows.length > 0) {
      const clientData = {
        name: clientResult.rows[0][0],
        document: clientResult.rows[0][1],
        phone: clientResult.rows[0][2],
        address: clientResult.rows[0][3],
        email: clientResult.rows[0][4]
      };
      res.status(200).json(clientData);
    } else {
      res.status(404).json({ message: 'Cliente no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener datos del cliente:', error);
    res.status(500).send({ message: 'Error al obtener datos del cliente' });
  }
});


async function actualizarClasificacionCliente(clientId) {
  try {
    const updateQuery = `CALL ACTUALIZAR_CLASIFICACION_CLIENTE(:cliente_id)`;
    await executeQuery(updateQuery, { cliente_id: clientId });
    console.log('Clasificación del cliente actualizada');
  } catch (error) {
    console.error('Error al actualizar la clasificación del cliente:', error);
  }
}


app.post('/register-sale', async (req, res) => {
  const { client, products, payment, date, seller } = req.body;

  if (!client.name || !client.document || !client.phone || !client.address || !client.email) {
    return res.status(400).send({ message: 'Todos los campos son obligatorios' });
  }

  try {
    console.log("Método de Pago Recibido:", payment);

    let clientResult = await executeQuery(
      `SELECT CLIENTE_ID FROM CLIENTES WHERE DOCUMENTO_IDENTIDAD = :document`,
      { document: client.document }
    );

    let clientId;
    if (clientResult.rows.length > 0) {
      clientId = clientResult.rows[0][0];
      console.log(`Cliente existente encontrado: CLIENTE_ID = ${clientId}`);
    } else {
      console.log("Cliente no encontrado. Registrando nuevo cliente...");
      const clientQuery = `
        INSERT INTO CLIENTES (NOMBRE, DOCUMENTO_IDENTIDAD, TELEFONO, DIRECCION, CORREO_ELECTRONICO, ESTADO)
        VALUES (:nombre, :documento, :telefono, :direccion, :correo_electronico, 'activo')
        RETURNING CLIENTE_ID INTO :clientId`;
      clientResult = await executeQuery(clientQuery, {
        nombre: client.name,
        documento: client.document,
        telefono: client.phone,
        direccion: client.address,
        correo_electronico: client.email,
        clientId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      });
      clientId = clientResult.outBinds.clientId[0];
      console.log(`Nuevo cliente registrado: CLIENTE_ID = ${clientId}`);
    }

    let total = 0;
    for (let product of products) {
      total += product.price * product.quantity;
    }
    console.log(`Total calculado para la venta: ${total}`);

    for (let product of products) {
      const stockResult = await executeQuery(
        `SELECT STOCK FROM PRODUCTOS WHERE PRODUCTO_ID = :producto_id`,
        { producto_id: product.product_id }
      );
      if (stockResult.rows.length > 0) {
        const stock = stockResult.rows[0][0];
        if (stock < product.quantity) {
          return res.status(400).send({ message: `No hay suficiente stock para el producto ${product.description}` });
        }
      } else {
        return res.status(400).send({ message: `Producto con ID ${product.product_id} no encontrado` });
      }
    }

    const saleQuery = `
      INSERT INTO VENTAS (CLIENTE_ID, FECHA, TOTAL, METODO_PAGO, VENDEDOR)
      VALUES (:cliente_id, TO_DATE(:fecha, 'YYYY-MM-DD'), :total, :metodo_pago, :vendedor)
      RETURNING VENTA_ID INTO :saleId`;
    const saleResult = await executeQuery(saleQuery, {
      cliente_id: clientId,
      fecha: date,
      total: total,
      metodo_pago: payment,
      vendedor: seller,
      saleId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });

    const saleId = saleResult.outBinds.saleId[0];
    console.log(`Venta registrada: VENTA_ID = ${saleId}`);

    for (let product of products) {
      const detailIdQuery = `SELECT DETALLE_VENTAS_SEQ.NEXTVAL AS detalle_id FROM DUAL`;
      const detailIdResult = await executeQuery(detailIdQuery);
      const detalleId = detailIdResult.rows[0][0];

      const saleDetailQuery = `
        INSERT INTO DETALLE_VENTAS (DETALLE_ID, VENTA_ID, PRODUCTO_ID, CANTIDAD, PRECIO)
        VALUES (:detalle_id, :venta_id, :producto_id, :cantidad, :precio_unitario)`;
      await executeQuery(saleDetailQuery, {
        detalle_id: detalleId,
        venta_id: saleId,
        producto_id: product.product_id,
        cantidad: product.quantity,
        precio_unitario: product.price
      });

      const updateInventoryQuery = `
        UPDATE PRODUCTOS
        SET STOCK = STOCK - :cantidad
        WHERE PRODUCTO_ID = :producto_id`;
      await executeQuery(updateInventoryQuery, {
        cantidad: product.quantity,
        producto_id: product.product_id
      });

      const transactionLogQuery = `
        INSERT INTO TRANSACCIONES (FECHA, PRODUCTO_ID, CANTIDAD, TIPO, MOTIVO)
        VALUES (TO_DATE(:fecha, 'YYYY-MM-DD'), :producto_id, :cantidad, 'SALIDA', 'Venta al cliente')`;
      await executeQuery(transactionLogQuery, {
        fecha: date,
        producto_id: product.product_id,
        cantidad: product.quantity
      });
    }

    // Generar el PDF mejorado
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const titleFontSize = 18;
    const fontSize = 12;
    const lineHeight = 14;
    const margin = 50;
    let y = height - margin;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.setFont(font);

    page.drawText('Comprobante de Venta', {
      x: margin,
      y,
      size: titleFontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= titleFontSize + 20;

    const clientInfo = `
      Cliente: ${client.name}
      Documento de Identidad: ${client.document}
      Teléfono: ${client.phone}
      Dirección: ${client.address}
      Correo Electrónico: ${client.email}`;

    const clientLines = clientInfo.trim().split('\n');
    clientLines.forEach(line => {
      page.drawText(line, { x: margin, y, size: fontSize, color: rgb(0, 0, 0) });
      y -= lineHeight;
    });

    y -= lineHeight;

    page.drawText('Productos Vendidos:', {
      x: margin,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    y -= fontSize + 4;

    products.forEach(product => {
      const productInfo = `- ${product.description}: ${product.quantity} x ${product.price} = ${product.quantity * product.price}`;
      page.drawText(productInfo, {
        x: margin,
        y,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      y -= fontSize + 4;
    });

    y -= fontSize;

    page.drawText(`Total: ${total}`, {
      x: margin,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
      font: boldFont,
    });

    const pdfBytes = await pdfDoc.save();

    const comprobanteDir = path.join(__dirname, 'public', 'comprobantes');
    if (!fs.existsSync(comprobanteDir)) {
      fs.mkdirSync(comprobanteDir, { recursive: true });
    }

    const pdfPath = path.join(comprobanteDir, `comprobante_${saleId}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'yostiancortes123@gmail.com',
        pass: 'nrkl dsyc zemq yboy'
      }
    });

    const mailOptions = {
      from: 'yostiancortes123@gmail.com',
      to: client.email,
      subject: 'Comprobante de Venta - Tecshop',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">Comprobante de Venta</h2>
          <p>Estimado <strong>${client.name}</strong>,</p>
          <p>Gracias por su compra en Tecshop. A continuación, encontrará los detalles de su venta:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Fecha:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Método de Pago:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${payment}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Vendedor:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${seller}</td>
            </tr>
          </table>
          <h3 style="color: #4CAF50;">Productos Vendidos:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${products.map(product => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${product.description}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${product.quantity} x ${product.price}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${product.quantity * product.price}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="2" style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total:</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${total}</td>
            </tr>
          </table>
          <p>Adjunto encontrará el comprobante de su compra en formato PDF.</p>
          <p>Atentamente,<br>El equipo de Tecshop</p>
          <hr style="border-top: 1px solid #ddd;">
          <p style="font-size: 0.9em;">Tecshop<br>Dirección: Calle Falsa 123, Ciudad, País<br>Teléfono: (123) 456-7890<br>Correo electrónico: contacto@tecshop.com</p>
        </div>
      `,
      attachments: [
        {
          filename: `comprobante_${saleId}.pdf`,
          path: pdfPath
        }
      ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error al enviar el correo:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    await actualizarClasificacionCliente(clientId);

    const fileUrl = `/public/comprobantes/comprobante_${saleId}.pdf`;
    res.status(200).send({ message: 'Venta registrada exitosamente', fileUrl });
  } catch (error) {
    console.error("Error al registrar la venta:", error);
    res.status(500).send({ message: 'Error al registrar la venta' });
  }
});



app.post('/clientes/actualizar-clasificaciones-inactividad', async (req, res) => {
  try {
    await actualizarClasificacionesPorInactividad();
    res.status(200).send({ message: 'Clasificaciones actualizadas' });
  } catch (error) {
    console.error('Error al actualizar clasificaciones por inactividad:', error);
    res.status(500).send({ message: 'Error al actualizar clasificaciones' });
  }
});

cron.schedule('0 0 * * *', async () => {
  try {
    await actualizarClasificacionesPorInactividad();
    console.log('Clasificaciones actualizadas por inactividad');
  } catch (error) {
    console.error('Error al actualizar clasificaciones por inactividad:', error);
  }
});







app.get('/api/ventas-registradas', async (req, res) => {
  try {
    const { month, year } = req.query;

    const salesResult = await executeQuery(
      `SELECT TO_CHAR(VENTAS.FECHA, 'YYYY-MM-DD') AS FECHA, SUM(DETALLE_VENTAS.CANTIDAD) AS TOTAL_CANTIDAD
       FROM VENTAS
       JOIN DETALLE_VENTAS ON VENTAS.VENTA_ID = DETALLE_VENTAS.VENTA_ID
       WHERE EXTRACT(MONTH FROM VENTAS.FECHA) = :month AND EXTRACT(YEAR FROM VENTAS.FECHA) = :year
       GROUP BY TO_CHAR(VENTAS.FECHA, 'YYYY-MM-DD')
       ORDER BY FECHA`,
      { month, year }
    );

    const sales = salesResult.rows.map(row => ({
      date: row[0],
      totalQuantity: row[1]
    }));

    res.status(200).json(sales);
  } catch (error) {
    console.error('Error al obtener las ventas registradas:', error);
    res.status(500).send({ message: 'Error al obtener las ventas registradas' });
  }
});




// ENDPOINT PARA GENERAR REPORTES
app.get('/generar-reporte', async (req, res) => {
  const tipo = req.query.tipo;
  let query = '';
  let binds = [];
  let options = { outFormat: oracledb.OUT_FORMAT_OBJECT };

  const metodoPagoTraducciones = {
    'card': 'Tarjeta',
    'transfer': 'Transferencia',
    'cash': 'Efectivo'
  };

  switch (tipo) {
      case 'ventas':
          query = `SELECT V.VENTA_ID, TO_CHAR(V.FECHA, 'YYYY-MM-DD') AS FECHA, C.NOMBRE AS CLIENTE, 
                           SUM(DV.CANTIDAD * DV.PRECIO) AS TOTAL_VENTA, V.METODO_PAGO, V.VENDEDOR
                   FROM VENTAS V
                   JOIN DETALLE_VENTAS DV ON V.VENTA_ID = DV.VENTA_ID
                   JOIN CLIENTES C ON V.CLIENTE_ID = C.CLIENTE_ID
                   GROUP BY V.VENTA_ID, V.FECHA, C.NOMBRE, V.METODO_PAGO, V.VENDEDOR
                   ORDER BY V.FECHA DESC`;
          break;
      case 'inventario':
          query = `SELECT P.PRODUCTO_ID, P.NOMBRE, P.DESCRIPCION, P.PRECIO, P.STOCK, P.CATEGORIA, P.STOCK_MINIMO
                   FROM PRODUCTOS P
                   ORDER BY P.NOMBRE`;
          break;
      case 'envios':
          query = `SELECT E.ENVIO_ID, TO_CHAR(E.FECHA, 'YYYY-MM-DD') AS FECHA, E.CLIENTE_DOCUMENTO, E.CLIENTE_NOMBRE, 
                           E.DIRECCION_DESTINO, E.COSTO_ENVIO, E.ESTADO_ENVIO,
                           (SELECT SUM(D.PRECIO * D.CANTIDAD) 
                            FROM DETALLE_VENTAS D 
                            WHERE D.VENTA_ID = E.ENVIO_ID) AS PRECIO_PRODUCTOS,
                           E.COSTO_ENVIO + 
                           (SELECT SUM(D.PRECIO * D.CANTIDAD) 
                            FROM DETALLE_VENTAS D 
                            WHERE D.VENTA_ID = E.ENVIO_ID) AS PRECIO_TOTAL
                   FROM ENVIOS E
                   ORDER BY E.FECHA DESC`;
          break;
      default:
          res.status(400).json({ error: 'Tipo de reporte no válido' });
          return;
  }

  try {
      const result = await executeQuery(query, binds, options);
      let rows = result.rows;

      // Traducir los métodos de pago si es un reporte de ventas
      if (tipo === 'ventas') {
          rows = rows.map(row => {
              return {
                  ...row,
                  METODO_PAGO: metodoPagoTraducciones[row.METODO_PAGO] || row.METODO_PAGO
              };
          });
      }

      res.json(rows);
  } catch (err) {
      res.status(500).json({ error: 'Error al generar el reporte: ' + err.message });
  }
});



app.get('/verificar-stock-bajo', async (req, res) => {
  const query = `
    SELECT PRODUCTO_ID, NOMBRE, STOCK, STOCK_MINIMO
    FROM PRODUCTOS
    WHERE STOCK <= COALESCE(STOCK_MINIMO, 0)
  `;
  try {
    const result = await executeQuery(query);
    res.json(result.rows.map(row => ({
      PRODUCTO_ID: row[0],
      NOMBRE: row[1],
      STOCK: row[2],
      STOCK_MINIMO: row[3]
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar el stock: ' + err.message });
  }
});





app.get('/api/productos-mas-vendidos', async (req, res) => {
  let connection;

  try {
    const { month, year } = req.query;

    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `BEGIN obtener_productos_mas_vendidos_mes(:month, :year, :cursor); END;`,
      {
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    await resultSet.close();

    const productosMasVendidos = rows.map(row => ({
      name: row[0],
      quantity: row[1]
    }));

    res.json(productosMasVendidos);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener datos');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});



app.get('/transacciones', async (req, res) => {
  try {
    const { fecha, producto, tipo } = req.query;

    let query = `
      SELECT t.TRANSACCION_ID, t.FECHA, p.NOMBRE AS PRODUCTO, t.CANTIDAD, t.MOTIVO, t.TIPO
      FROM TRANSACCIONES t
      JOIN PRODUCTOS p ON t.PRODUCTO_ID = p.PRODUCTO_ID
    `;

    // Construir condiciones basadas en los filtros proporcionados
    const conditions = [];
    const values = [];

    if (fecha) {
      conditions.push(`t.FECHA = TO_DATE(:fecha, 'YYYY-MM-DD')`);
      values.push({ name: 'fecha', val: fecha });
    }
    if (producto) {
      conditions.push(`LOWER(p.NOMBRE) LIKE :producto`);
      values.push({ name: 'producto', val: `%${producto.toLowerCase()}%` });
    }
    if (tipo) {
      conditions.push(`t.TIPO = :tipo`);
      values.push({ name: 'tipo', val: tipo });
    }

    // Agregar las condiciones al query si hay alguna
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Agregar la ordenación al query
    query += ' ORDER BY t.FECHA DESC';

    const binds = {};
    values.forEach((value, index) => {
      binds[value.name] = value.val;
    });

    const result = await executeQuery(query, binds, {}, true);  // Pasar valores como segundo parámetro
    if (result.rows.length > 0) {
      res.json(result.rows.map(transaccion => ({
        TRANSACCION_ID: transaccion.TRANSACCION_ID,
        FECHA: transaccion.FECHA ? transaccion.FECHA.toISOString().split('T')[0] : 'Fecha no disponible',
        PRODUCTO: transaccion.PRODUCTO || 'Producto no disponible',
        CANTIDAD: transaccion.CANTIDAD || 'Cantidad no disponible',
        MOTIVO: transaccion.MOTIVO || 'Motivo no disponible',
        TIPO: transaccion.TIPO || 'Tipo no disponible'
      })));
    } else {
      res.status(404).send('No se encontraron transacciones');
    }
  } catch (err) {
    console.error('Error en el servidor al obtener las transacciones', err);
    res.status(500).send('Error interno del servidor');
  }
});



 // Endpoint para registrar proveedores y transacciones
 app.post('/api/proveedores', async (req, res) => {
  const { nombre, numero_ruc, telefono, correo_electronico, tipo_proveedor, direccion, productos } = req.body;

  const productosArray = Array.isArray(productos) ? productos : productos.split(',').map(p => p.trim());
  const productosStr = productosArray.join(',');

  const insertProveedorQuery = `
    BEGIN
      insert_proveedor(:nombre, :numero_ruc, :telefono, :correo_electronico, :tipo_proveedor, :direccion, :productos);
    END;
  `;

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Insertar proveedor
    await connection.execute(insertProveedorQuery, {
      nombre,
      numero_ruc,
      telefono,
      correo_electronico,
      tipo_proveedor,
      direccion,
      productos: productosStr
    });

    // Registrar entrada en la tabla de transacciones
    for (const producto of productosArray) {
      const productResult = await connection.execute(
        `SELECT PRODUCTO_ID FROM PRODUCTOS WHERE NOMBRE = :producto`,
        { producto },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (productResult.rows.length > 0) {
        const producto_id = productResult.rows[0].PRODUCTO_ID;
        await connection.execute(
          `INSERT INTO TRANSACCIONES (TRANSACCION_ID, PRODUCTO_ID, CANTIDAD, MOTIVO, TIPO, FECHA)
           VALUES (SEQ_TRANSACCION_ID.NEXTVAL, :producto_id, 1, 'Entrada por proveedor', 'ENTRADA', SYSDATE)`,
          { producto_id }
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Proveedor agregado con éxito y transacciones registradas' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (err) {
        console.error('Error al hacer rollback:', err);
      }
    }
    console.error('Error adding proveedor:', error);
    res.status(500).json({ message: 'Error adding proveedor' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error cerrando la conexión:', err);
      }
    }
  }
});

// Endpoint para registrar transacciones
app.post('/api/transacciones', async (req, res) => {
  const { producto_id, cantidad, motivo, tipo } = req.body;

  const insertTransaccionQuery = `
    INSERT INTO TRANSACCIONES (TRANSACCION_ID, PRODUCTO_ID, CANTIDAD, MOTIVO, TIPO, FECHA)
    VALUES (SEQ_TRANSACCION_ID.NEXTVAL, :producto_id, :cantidad, :motivo, :tipo, SYSDATE)
  `;

  try {
    await executeQuery(insertTransaccionQuery, {
      producto_id,
      cantidad,
      motivo,
      tipo
    });

    res.status(201).json({ message: 'Transacción registrada con éxito' });
  } catch (error) {
    console.error('Error adding transaccion:', error);
    res.status(500).json({ message: 'Error registrando la transacción' });
  }
});




// Endpoint para obtener todos los proveedores o buscar proveedores
app.get('/api/proveedores', async (req, res) => {
  const { search } = req.query;

  try {
    let query = `
      SELECT p.PROVEEDOR_ID, p.NOMBRE, p.TELEFONO, p.NUMERO_RUC, p.CORREO_ELECTRONICO, p.TIPO_PROVEEDOR, p.DIRECCION,
             (SELECT LISTAGG(prod.NOMBRE, ',') WITHIN GROUP (ORDER BY prod.NOMBRE)
              FROM PRODUCTOS prod
              WHERE prod.PROVEEDOR_ID = p.PROVEEDOR_ID) AS productos
      FROM PROVEEDORES p
    `;

    if (search) {
      query += ` WHERE LOWER(p.NOMBRE) LIKE '%' || LOWER(:search) || '%'`;
    }

    const result = await executeQuery(query, search ? { search } : {}, {}, true);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    res.status(500).json({ message: 'Error fetching proveedores' });
  }
});


// Endpoint para obtener un proveedor específico por ID
app.get('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT p.PROVEEDOR_ID, p.NOMBRE, p.TELEFONO, p.NUMERO_RUC, p.CORREO_ELECTRONICO, p.TIPO_PROVEEDOR, p.DIRECCION,
             (SELECT LISTAGG(prod.NOMBRE, ',') WITHIN GROUP (ORDER BY prod.NOMBRE)
              FROM PRODUCTOS prod
              WHERE prod.PROVEEDOR_ID = p.PROVEEDOR_ID) AS productos
      FROM PROVEEDORES p
      WHERE p.PROVEEDOR_ID = :id
    `;
    const result = await executeQuery(query, { id }, {}, true);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching proveedor:', error);
    res.status(500).json({ message: 'Error fetching proveedor' });
  }
});



app.delete('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await executeQuery('DELETE FROM PRODUCTOS WHERE PROVEEDOR_ID = :id', { id });
    await executeQuery('DELETE FROM PROVEEDORES WHERE PROVEEDOR_ID = :id', { id });
    res.status(200).json({ message: 'Proveedor dado de baja con éxito' });
  } catch (error) {
    console.error('Error deleting proveedor:', error);
    res.status(500).json({ message: 'Error deleting proveedor' });
  }
});



// Endpoint para actualizar un proveedor específico por ID
app.put('/api/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, numero_ruc, telefono, correo_electronico, tipo_proveedor, direccion, productos } = req.body;

  let connection;

  try {
      connection = await oracledb.getConnection(dbConfig);

      // Iniciar la transacción
      await connection.execute(
          `UPDATE PROVEEDORES 
          SET NOMBRE = :nombre, NUMERO_RUC = :numero_ruc, TELEFONO = :telefono, CORREO_ELECTRONICO = :correo_electronico, 
              TIPO_PROVEEDOR = :tipo_proveedor, DIRECCION = :direccion 
          WHERE PROVEEDOR_ID = :id`,
          { id, nombre, numero_ruc, telefono, correo_electronico, tipo_proveedor, direccion }
      );

      // Obtener productos existentes para el proveedor
      const result = await connection.execute(
          `SELECT NOMBRE FROM PRODUCTOS WHERE PROVEEDOR_ID = :id`,
          { id }
      );

      const existingProducts = result.rows.map(row => row[0]);
      const newProductsArray = Array.isArray(productos) ? productos : productos.split(',').map(p => p.trim());

      const productsToDelete = existingProducts.filter(p => !newProductsArray.includes(p));
      const productsToAdd = newProductsArray.filter(p => !existingProducts.includes(p));

      // Eliminar productos no presentes en la nueva lista
      for (const product of productsToDelete) {
          await connection.execute(
              `DELETE FROM PRODUCTOS WHERE NOMBRE = :nombre AND PROVEEDOR_ID = :proveedor_id`,
              { nombre: product, proveedor_id: id }
          );
      }

      // Insertar nuevos productos
      for (const product of productsToAdd) {
          await connection.execute(
              `INSERT INTO PRODUCTOS (NOMBRE, PROVEEDOR_ID) VALUES (:nombre, :proveedor_id)`,
              { nombre: product, proveedor_id: id }
          );
      }

      // Confirmar la transacción
      await connection.commit();
      res.json({ message: 'Proveedor actualizado con éxito' });
  } catch (error) {
      console.error('Error updating proveedor:', error);
      if (connection) {
          try {
              await connection.rollback();
          } catch (rollbackError) {
              console.error('Error during rollback:', rollbackError);
          }
      }
      res.status(500).json({ message: 'Error updating proveedor' });
  } finally {
      if (connection) {
          try {
              await connection.close();
          } catch (err) {
              console.error('Error closing connection:', err);
          }
      }
  }
});



// Endpoint para obtener productos
app.get('/products', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM PRODUCTOS', {}, {}, true);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// Endpoint para obtener un cliente por documento
app.get('/get-client-by-doc/:doc', async (req, res) => {
  const { doc } = req.params;
  const query = `SELECT * FROM CLIENTES WHERE DOCUMENTO_IDENTIDAD = :doc`;

  try {
    const result = await executeQuery(query, { doc }, {}, true);
    if (result.rows.length === 0) {
      return res.status(404).send({ error: "Client not found" });
    }
    res.status(200).send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ error: "Error fetching client" });
  }
});




// Endpoint para registrar un envío
app.post('/register-shipment', async (req, res) => {
  const { cliente_documento, cliente_nombre, cliente_direccion, cliente_telefono, direccion_destino, costo_envio, estado_envio, productos, cliente_correo } = req.body;

  if (!cliente_documento || !direccion_destino || !costo_envio || !estado_envio || !productos || productos.length === 0) {
    return res.status(400).send({ error: "Todos los campos son obligatorios" });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Verificar si el cliente existe
    const clienteResult = await connection.execute(
      `SELECT * FROM CLIENTES WHERE DOCUMENTO_IDENTIDAD = :documento`,
      { documento: cliente_documento }
    );

    if (clienteResult.rows.length === 0) {
      // Registrar el cliente si no existe
      await connection.execute(
        `INSERT INTO CLIENTES (CLIENTE_ID, NOMBRE, DOCUMENTO_IDENTIDAD, TELEFONO, CORREO_ELECTRONICO, DIRECCION, ESTADO) 
         VALUES (CLIENTE_ID_SEQ.NEXTVAL, :nombre, :documento, :telefono, :correo, :direccion, 'activo')`,
        {
          nombre: cliente_nombre,
          documento: cliente_documento,
          telefono: cliente_telefono,
          correo: cliente_correo,
          direccion: cliente_direccion
        }
      );
    }

    const result = await connection.execute(
      `INSERT INTO ENVIOS (ENVIO_ID, CLIENTE_DOCUMENTO, CLIENTE_NOMBRE, CLIENTE_DIRECCION, CLIENTE_TELEFONO, DIRECCION_DESTINO, COSTO_ENVIO, ESTADO_ENVIO, FECHA) 
       VALUES (SEQ_ENVIO_ID.NEXTVAL, :cliente_documento, :cliente_nombre, :cliente_direccion, :cliente_telefono, :direccion_destino, :costo_envio, :estado_envio, SYSDATE) 
       RETURNING ENVIO_ID INTO :envio_id`,
      {
        cliente_documento,
        cliente_nombre,
        cliente_direccion,
        cliente_telefono,
        direccion_destino,
        costo_envio,
        estado_envio,
        envio_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const envioId = result.outBinds.envio_id[0];

    let totalProductos = 0;

    for (const producto of productos) {
      const productResult = await connection.execute(
        `SELECT PRECIO FROM PRODUCTOS WHERE PRODUCTO_ID = :producto_id`,
        { producto_id: producto.producto_id }
      );

      if (productResult.rows.length === 0) {
        console.error('Producto no encontrado:', producto.producto_id);
        continue;
      }

      const precio = productResult.rows[0][0];
      if (!precio) {
        console.error('El precio del producto es nulo:', producto.producto_id);
        continue;
      }

      totalProductos += precio * producto.cantidad;

      await connection.execute(
        `INSERT INTO DETALLE_VENTAS (VENTA_ID, PRODUCTO_ID, CANTIDAD, PRECIO) 
         VALUES (:envioId, :producto_id, :cantidad, :precio)`,
        {
          envioId,
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          precio: precio
        }
      );

      await connection.execute(
        `UPDATE PRODUCTOS SET STOCK = STOCK - :cantidad WHERE PRODUCTO_ID = :producto_id`,
        {
          cantidad: producto.cantidad,
          producto_id: producto.producto_id
        }
      );

      // Registrar la salida en la tabla de transacciones
      await connection.execute(
        `INSERT INTO TRANSACCIONES (TRANSACCION_ID, PRODUCTO_ID, CANTIDAD, MOTIVO, TIPO, FECHA)
         VALUES (SEQ_TRANSACCION_ID.NEXTVAL, :producto_id, :cantidad, 'Salida por envío', 'SALIDA', SYSDATE)`,
        {
          producto_id: producto.producto_id,
          cantidad: producto.cantidad
        }
      );
    }

    const totalEnvio = totalProductos + costo_envio;

    await connection.commit();

    const mailOptions = {
      from: 'yostiancortes123@gmail.com',
      to: cliente_correo,
      subject: 'Confirmación de Envío - Tecshop',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">Confirmación de Envío</h2>
          <p>Estimado <strong>${cliente_nombre}</strong>,</p>
          <p>Nos complace informarle que su envío ha sido registrado exitosamente. A continuación, encontrará los detalles de su envío:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">ID del Envío:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${envioId}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Dirección de Destino:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${direccion_destino}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Costo de Envío:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${costo_envio}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Costo de Productos:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${totalProductos}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total:</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${totalEnvio}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Estado del Envío:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${estado_envio}</td>
            </tr>
          </table>
          <p>Gracias por su preferencia. Si tiene alguna pregunta o necesita más información, no dude en contactarnos.</p>
          <p>Atentamente,<br>El equipo de Tecshop</p>
          <hr style="border-top: 1px solid #ddd;">
          <p style="font-size: 0.9em;">Tecshop<br>Dirección: Calle 12, La Sabana, Costa Rica<br>Teléfono: (123) 456-7890<br>Correo electrónico: contacto@Tecshop.com</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error al enviar el correo:', error);
      } else {
        console.log('Correo enviado:', info.response);
      }
    });

    res.status(200).send({ message: "Envío registrado y correo enviado exitosamente" });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (err) {
        console.error('Error al hacer rollback:', err);
      }
    }
    console.error('Error registrando el envío:', error);
    res.status(500).send({ error: "Error registrando el envío" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error cerrando la conexión:', err);
      }
    }
  }
});





// Endpoint para obtener todos los envíos
app.get('/shipments', async (req, res) => {
  const query = `
    SELECT E.*, 
           (SELECT SUM(D.PRECIO * D.CANTIDAD) FROM DETALLE_VENTAS D WHERE D.VENTA_ID = E.ENVIO_ID) AS PRECIO_PRODUCTOS,
           E.COSTO_ENVIO + (SELECT SUM(D.PRECIO * D.CANTIDAD) FROM DETALLE_VENTAS D WHERE D.VENTA_ID = E.ENVIO_ID) AS PRECIO_TOTAL
    FROM ENVIOS E
  `;

  try {
    const result = await executeQuery(query, {}, {}, true);
    res.status(200).send(result.rows);
  } catch (error) {
    res.status(500).send({ error: "Error fetching shipments" });
  }
});






const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yostiancortes123@gmail.com',
    pass: 'nrkl dsyc zemq yboy'  
  }
});

function enviarCorreo(clienteCorreo, asunto, mensaje) {
  const mailOptions = {
    from: 'yostiancortes123@gmail.com',
    to: clienteCorreo,
    subject: asunto,
    text: mensaje
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error al enviar el correo:', error);
    } else {
      console.log('Correo enviado:', info.response);
    }
  });
}


// Endpoint para obtener un envío por ID
app.get('/shipments/:id', async (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT E.*, 
           (SELECT SUM(D.PRECIO * D.CANTIDAD) FROM DETALLE_VENTAS D WHERE D.VENTA_ID = E.ENVIO_ID) AS PRECIO_TOTAL 
    FROM ENVIOS E
    WHERE E.ENVIO_ID = :id
  `;

  try {
    const result = await executeQuery(query, { id }, {}, true);
    if (result.rows.length === 0) {
      return res.status(404).send({ error: "Shipment not found" });
    }

    const shipment = result.rows[0];
    const productQuery = `
      SELECT D.PRODUCTO_ID, P.NOMBRE, D.CANTIDAD, D.PRECIO
      FROM DETALLE_VENTAS D
      JOIN PRODUCTOS P ON D.PRODUCTO_ID = P.PRODUCTO_ID
      WHERE D.VENTA_ID = :id
    `;
    const productResult = await executeQuery(productQuery, { id }, {}, true);
    shipment.PRODUCTOS = productResult.rows;
    res.status(200).send(shipment);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).send({ error: "Error fetching shipment" });
  }
});


// Endpoint para actualizar un envío
app.put('/shipments/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente_documento, cliente_nombre, cliente_direccion, cliente_telefono, direccion_destino, costo_envio, estado_envio, productos } = req.body;

  const connection = await oracledb.getConnection(dbConfig);
  try {
    // Si solo se envía el estado_envio, solo actualizar el estado
    if (estado_envio && !cliente_documento && !cliente_nombre && !cliente_direccion && !cliente_telefono && !direccion_destino && !costo_envio && !productos) {
      await connection.execute(
        `UPDATE ENVIOS 
         SET ESTADO_ENVIO = :estado_envio
         WHERE ENVIO_ID = :id`,
        {
          estado_envio,
          id
        },
        { autoCommit: true }
      );
    } else {
      // Actualizar información del envío
      await connection.execute(
        `UPDATE ENVIOS 
         SET CLIENTE_DOCUMENTO = :cliente_documento,
             CLIENTE_NOMBRE = :cliente_nombre,
             CLIENTE_DIRECCION = :cliente_direccion,
             CLIENTE_TELEFONO = :cliente_telefono,
             DIRECCION_DESTINO = :direccion_destino,
             COSTO_ENVIO = :costo_envio,
             ESTADO_ENVIO = :estado_envio
         WHERE ENVIO_ID = :id`,
        {
          cliente_documento,
          cliente_nombre,
          cliente_direccion,
          cliente_telefono,
          direccion_destino,
          costo_envio,
          estado_envio,
          id
        },
        { autoCommit: false }
      );

      // Eliminar detalles anteriores del envío
      await connection.execute(
        `DELETE FROM DETALLE_VENTAS WHERE VENTA_ID = :id`,
        { id },
        { autoCommit: false }
      );

      // Actualizar stock de productos
      for (const producto of productos) {
        await connection.execute(
          `UPDATE PRODUCTOS SET STOCK = STOCK + :cantidad WHERE PRODUCTO_ID = :producto_id`,
          {
            cantidad: producto.cantidad,
            producto_id: producto.producto_id
          },
          { autoCommit: false }
        );
      }

      // Insertar nuevos detalles del envío
      for (const producto of productos) {
        await connection.execute(
          `INSERT INTO DETALLE_VENTAS (VENTA_ID, PRODUCTO_ID, CANTIDAD, PRECIO) 
           VALUES (:envioId, :producto_id, :cantidad, (SELECT PRECIO FROM PRODUCTOS WHERE PRODUCTO_ID = :producto_id))`,
          {
            envioId: id,
            producto_id: producto.producto_id,
            cantidad: producto.cantidad
          },
          { autoCommit: false }
        );

        // Actualizar stock de productos
        await connection.execute(
          `UPDATE PRODUCTOS SET STOCK = STOCK - :cantidad WHERE PRODUCTO_ID = :producto_id`,
          {
            cantidad: producto.cantidad,
            producto_id: producto.producto_id
          },
          { autoCommit: false }
        );
      }

      await connection.commit();
    }
    res.status(200).send({ message: "Shipment updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating shipment:', error);
    res.status(500).send({ error: "Error updating shipment" });
  } finally {
    await connection.close();
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}