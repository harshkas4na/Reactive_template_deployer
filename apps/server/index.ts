// create a basic express app
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import generateRouter from './routes/generate';
import rscMonitorRouter from './routes/rsc-monitor'
import rscChecker from './routes/rsc-checker'
import dotenv from 'dotenv';

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
dotenv.config();


app.use('/', generateRouter);
app.use('/rsc-checker',rscChecker)

app.use('/rsc-monitor', rscMonitorRouter);


app.listen(5000, () => {
  console.log('Server listening on port 5000');
});
