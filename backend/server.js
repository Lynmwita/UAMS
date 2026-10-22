require('dotenv').config();
const {createGateway}=require('./src/gateway');
const app=createGateway();
if(require.main===module){
 if(process.env.NODE_ENV==='production'&&!process.env.UAMS_API_ORIGIN)throw new Error('UAMS_API_ORIGIN is required in production.');
 const port=Number(process.env.PORT||4000);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid TCP port.');
 app.listen(port,()=>console.log('[UAMS] API gateway listening on port '+port));
}
module.exports=app;
