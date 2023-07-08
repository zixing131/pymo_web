var gamedata = undefined;
async function loadGame(gamename)
{
    return await ZipStore.loadZip(gamename);
}

function remove_null_end(data)
{
    var index=0;
    for(var i=0;i<data.length;i++)
    {
        if(data[i]==0)
        {
            index=i;
            break;
        }
    }
    data=data.slice(0,index);
    return new TextDecoder('gbk').decode(data).trim();
}   
function load_pak_file(filename)
{
    var data = gamedata.Zip[filename].compressed_data;

    var pakfile =new BinReader(data);

    var filecount = pakfile.readInt();
    var fileindex = {}
    var i=0
    while(i< filecount)
    {
        var rawname=remove_null_end(pakfile.read(32))
        var fileoffset= pakfile.readInt();
        var filelength=pakfile.readInt();
        fileindex[rawname]=[fileoffset,filelength]
        i+=1
    }
    console.log(pakfile,fileindex)
    return pakfile,fileindex
}


//执行pymo脚本
function ScriptParsePYMO()
{

}

///加载游戏
async function loadgame(){
    var params = {};

    location.search.substring(1).split("&").forEach(function (param) {
      param = param.split("=").map(function(v) {
        return v.replace(/\+/g, " ");
      }).map(decodeURIComponent);
      params[param[0]] = param[1];
    });

    var gamename = params["game"];
    console.log("loading "+gamename);
    
    gamedata=await loadGame(gamename);
    console.log(gamedata);

    //背景音乐
    var bg = load_pak_file("bg/bg.pak");


    ScriptParsePYMO();
    
}

window.addEventListener("load", () => { 
    loadgame();
})
