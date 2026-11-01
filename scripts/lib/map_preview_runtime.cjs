const vm=require('vm');
function validateMapRuntime(source){new vm.Script(source);for(const name of ['render','placeContent','eventDetail','activateEvent'])if((source.match(new RegExp('function '+name+'\\(','g'))||[]).length!==1)throw Error('Missing/duplicated map runtime: '+name);return source}
module.exports={validateMapRuntime};
