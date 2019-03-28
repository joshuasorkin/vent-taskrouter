/*
function pushOrCreate(obj,arrayName,newElement){
    if(obj[arrayName]){
        obj[arrayName].push(newElement);
    }
    else{
        jsonObj[arrayName]=[newElement];
    }
}


var taskAttributes={"abc":"123","xyz":"hello"};
pushOrCreate(taskAttributes,"workers","xx8238429");
pushOrCreate(taskAttributes,"workers","aa238232");
console.log(JSON.stringify(taskAttributes));
*/

const pushOrCreate = (key, { [key]:arr = [], ...o }, v) =>
  ({ ...o, [key]: [...arr, v] })

console.log(pushOrCreate('foo', {}, 1))
// { foo: [ 1 ] }

console.log(pushOrCreate('foo', {foo: [1]}, 2))
// { foo: [ 1, 2 ] }