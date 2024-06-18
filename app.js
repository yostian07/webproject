const express = require('express');
const oracledb = require('oracledb');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
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
const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET || 'your_secret_key';
const redisClient = redis.createClient();
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'https://57418ktj-3000.use2.devtunnels.ms'];
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

  const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, secret, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

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

  // Example of a protected route
  app.get('/api/protected', authenticateToken, csrfProtection, cache, (req, res) => {
    res.json({ message: 'This is a protected route', csrfToken: req.csrfToken() });
  });





// Endpoint para agregar un nuevo cliente
app.post('/clientes', async (req, res) => {
  const { nombre, documento_identidad, telefono, correo_electronico, direccion, estado } = req.body;
  try {
    const connection = await oracledb.getConnection(dbConfig);
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

    console.log(clientes); // Verifica aquí el formato de los datos

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

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const titleFontSize = 18;
    const fontSize = 12;
    const lineHeight = 14;
    let y = height - titleFontSize - 20;

    page.drawText('Comprobante de Venta', {
      x: 50,
      y,
      size: titleFontSize,
      color: rgb(0, 0, 0),
    });

    y -= titleFontSize + 10;

    const clientInfo = `
Cliente: ${client.name}
Documento de Identidad: ${client.document}
Teléfono: ${client.phone}
Dirección: ${client.address}
Correo Electrónico: ${client.email}`;

    const clientLines = clientInfo.trim().split('\n');
    clientLines.forEach(line => {
      page.drawText(line, { x: 50, y, size: fontSize, color: rgb(0, 0, 0) });
      y -= lineHeight;
    });

    y -= lineHeight;

    page.drawText('Productos Vendidos:', {
      x: 50,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    y -= fontSize + 4;

    products.forEach(product => {
      const productInfo = `- ${product.description}: ${product.quantity} x ${product.price} = ${product.quantity * product.price}`;
      page.drawText(productInfo, {
        x: 50,
        y,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      y -= fontSize + 4;
    });

    y -= fontSize;

    page.drawText(`Total: ${total}`, {
      x: 50,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
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
        pass: 'hlal jedp pnng pzuw'
      }
    });

    const mailOptions = {
      from: 'yostiancortes123@gmail.com',
      to: client.email,
      subject: 'Comprobante de Venta',
      text: 'Adjunto encontrarás el comprobante de tu compra.',
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
    const salesResult = await executeQuery(
      `SELECT TO_CHAR(VENTAS.FECHA, 'YYYY-MM-DD') AS FECHA, SUM(DETALLE_VENTAS.CANTIDAD) AS TOTAL_CANTIDAD
       FROM VENTAS
       JOIN DETALLE_VENTAS ON VENTAS.VENTA_ID = DETALLE_VENTAS.VENTA_ID
       GROUP BY TO_CHAR(VENTAS.FECHA, 'YYYY-MM-DD')
       ORDER BY FECHA`
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
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `BEGIN obtener_productos_mas_vendidos(:cursor); END;`,
      {
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
    const query = `
      SELECT t.TRANSACCION_ID, t.FECHA, p.NOMBRE AS PRODUCTO, t.CANTIDAD, t.MOTIVO
      FROM TRANSACCIONES t
      JOIN PRODUCTOS p ON t.PRODUCTO_ID = p.PRODUCTO_ID
      WHERE t.TIPO = 'SALIDA'
    `;
    const result = await executeQuery(query, {}, {}, true);  // true para obtener resultados como objetos
    if (result.rows.length > 0) {
      res.json(result.rows.map(transaccion => ({
        TRANSACCION_ID: transaccion.TRANSACCION_ID,
        FECHA: transaccion.FECHA ? transaccion.FECHA.toISOString().split('T')[0] : 'Fecha no disponible',
        PRODUCTO: transaccion.PRODUCTO || 'Producto no disponible',
        CANTIDAD: transaccion.CANTIDAD || 'Cantidad no disponible',
        MOTIVO: transaccion.MOTIVO || 'Motivo no disponible'
      })));
    } else {
      res.status(404).send('No se encontraron transacciones');
    }
  } catch (err) {
    console.error('Error en el servidor al obtener las transacciones', err);
    res.status(500).send('Error interno del servidor');
  }
});




app.post('/api/proveedores', async (req, res) => {
  const { nombre, numero_ruc, telefono, correo_electronico, tipo_proveedor, direccion, productos } = req.body;

  // Asegúrate de que productos sea un array
  const productosArray = Array.isArray(productos) ? productos : productos.split(',').map(p => p.trim());
  const productosStr = productosArray.join(',');

  const insertProveedorQuery = `
    BEGIN
      insert_proveedor(:nombre, :numero_ruc, :telefono, :correo_electronico, :tipo_proveedor, :direccion, :productos);
    END;
  `;

  try {
    await executeQuery(insertProveedorQuery, {
      nombre,
      numero_ruc,
      telefono,
      correo_electronico,
      tipo_proveedor,
      direccion,
      productos: productosStr
    });

    res.status(201).json({ message: 'Proveedor agregado con éxito' });
  } catch (error) {
    console.error('Error adding proveedor:', error);
    res.status(500).json({ message: 'Error adding proveedor' });
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
// Endpoint para registrar un envío
app.post('/register-shipment', async (req, res) => {
  const { cliente_documento, cliente_nombre, cliente_direccion, cliente_telefono, direccion_destino, costo_envio, estado_envio, productos } = req.body;
  if (!cliente_documento || !direccion_destino || !costo_envio || !estado_envio || !productos || productos.length === 0) {
      return res.status(400).send({ error: "All fields are required" });
  }

  const connection = await oracledb.getConnection(dbConfig);
  try {
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
          },
          { autoCommit: false }
      );

      const envioId = result.outBinds.envio_id[0];

      for (const producto of productos) {
          await connection.execute(
              `INSERT INTO DETALLE_VENTAS (VENTA_ID, PRODUCTO_ID, CANTIDAD, PRECIO) 
               VALUES (:envioId, :producto_id, :cantidad, (SELECT PRECIO FROM PRODUCTOS WHERE PRODUCTO_ID = :producto_id))`,
              {
                  envioId,
                  producto_id: producto.producto_id,
                  cantidad: producto.cantidad
              },
              { autoCommit: false }
          );

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
      res.status(200).send({ message: "Shipment registered successfully" });
  } catch (error) {
      await connection.rollback();
      console.error('Error registering shipment:', error);
      res.status(500).send({ error: "Error registering shipment" });
  } finally {
      await connection.close();
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