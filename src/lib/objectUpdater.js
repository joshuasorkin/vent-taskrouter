class ObjectUpdater{
    pushOrCreate(obj,arrayName,newElement){
        if(obj[arrayName]){
            obj[arrayName].push(newElement);
        }
        else{
            jsonObj[arrayName]=[newElement];
        }
    }
}

module.exports=ObjectUpdater;