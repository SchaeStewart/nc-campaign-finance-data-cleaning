const express = require('express');
const db = require('./db');
const app = express();
const port = 3000;

app.get('/status', (req, res) => res.send({ status: 'online' }));

app.get('/contributions/matches/:name/:addr1', async (req, res) => {
  const client = await db.getClient()
  try {
    const name = decodeURIComponent(req.params.name);
    const addr = decodeURIComponent(req.params.addr1);
    await client.query('select set_limit(0.7)')
    const records = await client.query(
      `select *
     ,similarity(name, $1) as name_sml
     ,similarity(street_line_1, $2) as addr1_sml
     from raw_contributions
     where name % $1
        and street_line_1 % $2`,
      [name, addr],
    );
    console.log(`Retrieved ${records.rowCount} rows`);
    res.send({ data: records.rows, count: records.rowCount});
  } catch (err) {
    console.error(err);
    res.status(500);
    return res.send({ error: 'unable to process request' });
  } finally {
      client.release()
  }
});

app.listen(port, () =>
  console.log(`app listening at http://localhost:${port}`),
);
