
var onUploadFile = function(e){
    const _files = e.target.files;
    if (_files.length == 0) {
        return;
    }
    const _file = _files[0];  
    if(!_file.name.toLowerCase().endsWith('.zip'))
    {
		showDialog("提示","只能上传zip格式!",closeDialog,closeDialog);   
        return;
    }
    //fs.createUniqueFile("/Phone",_file.name,_file);
    const reader = new FileReader();
    reader.readAsArrayBuffer(_file);
    reader.onload = function(readRes){
        ZIPStore.installJAR(_file.name,readRes.target.result).then
        (
            ()=>{ 
				showDialog("提示",_file.name+"安装成功！",closeDialog,closeDialog);  
                refreshGameList();
        },  
            (errname)=>{
					showDialog("提示",errname+"安装失败！",closeDialog,closeDialog);   
            }
            );	
    document.getElementById("zipFileupload").value= null;
    }    
}

window.addEventListener("load", () => { 
    document.getElementById("zipFileupload").addEventListener("change", onUploadFile); 
    refreshGameList(); 
})

main();

