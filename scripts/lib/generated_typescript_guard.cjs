// All generated TS candidates must parse before any source write.
const ts=require('typescript');
function validateGeneratedTypeScript(source){const parsed=ts.createSourceFile('candidate.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(parsed.parseDiagnostics.length)throw Error('Generated TypeScript syntax rejected: '+parsed.parseDiagnostics[0].messageText);return source}
module.exports={validateGeneratedTypeScript};
