import express from 'express';
import media from './utils/server.js'; 

const app = express();

// Use the router - all paths in userRouter will now start with /user
app.use('/user', media);

app.listen(9000, () => console.log('Server running...'));