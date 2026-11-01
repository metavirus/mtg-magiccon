const {validateGeneratedTypeScript}=require('./lib/generated_typescript_guard.cjs');
const token=String.fromCharCode(36)+"'",fixture='INSERT\nexport function example(){return 1}',insert="const price='"+token;
validateGeneratedTypeScript(fixture.replace('INSERT',()=>insert));
require('assert/strict').throws(()=>validateGeneratedTypeScript(fixture.replace('INSERT',insert)),/syntax rejected/);
