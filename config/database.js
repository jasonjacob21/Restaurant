import { Sequelize } from 'sequelize';
import env from  "dotenv";


env.config();



const db = new Sequelize({
    database: process.env.PG_DATABASE,
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false, // Disable SSL
    },
  });



  
export default db;
