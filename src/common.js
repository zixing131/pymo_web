function BinReader(data)
{
    this.pos=0;
    this.data=data;
    that = this;
    this.read = function(len)
    {
        var ret = that.data.slice(that.pos,that.pos+len);
        this.pos+=len;
        return ret;
    }
    this.readInt= function()
    {
        var ret = that.read(4); 
        var retint  = 0; 
        retint = (ret[3]<<24) +(ret[2]<<16) +(ret[1]<<8) + (ret[0]); 
        return retint;
    }
    return this;
}
var e32 = {
    drive_list : function(){
        return ["c","e"];
    } 
}

var os = {
    path:{ 
        join: function(...args) { 
            if (args.length === 0)
              return '.';  
            var allpath="";
            for(var i=0;i<args.length;i++)
            { 
                var nowp= args[i];
                nowp = nowp.replace("/","\\");
                if(nowp.endsWith("\\")==false)
                {
                    nowp=nowp+"\\";
                }
                allpath+=nowp;
            }
            return allpath;
        },
        exists:function(p){
            //是否存在资源，此处需要对接虚拟文件系统
            return true;
        }
    }
}

var appuifw={
    note:function(text,type)
    {
        alert(text);
    }
    ,
    app:{
        set_exit:function(){
            window.close();
        }
    }
}

var None = null;
var False = false;
var True = true;

function dictionary()
{
    var ret = {} 
    for(var i=0;i<arguments.length;i++)
    { 
        ret[arguments[i][0]] = arguments[i][1];
    }
    return ret;
}

function get_available_font()
{
    return 0;
}
function xhrGetFile(url)
{
    return new Promise((resolve,reject) => {
        var xhr = new XMLHttpRequest({mozSystem:true});
        xhr.open('GET', url, true);
        xhr.onload = function () {
        if (xhr.status === 200) {
            resolve(xhr.responseText);
        }else{
            reject();
        }
        };
        xhr.send(); 
      });
}
var stringres={};
async function load_string_res(path)
{
    var res =await xhrGetFile("pymo/stringres.txt");
    var resp = res.split('\n')
    for(var i=0;i<resp.length;i++)
    {
        var resstr = resp[i];
        var resstrsp=resstr.split(',');
        if(resstrsp.length==2)
        {
            stringres[resstrsp[0]]=resstrsp[1]
        }
    }
    return stringres;
}

function load_image(path,is_mask)
{
    return null;
}

async function main()
{
    var final_img = None;
    var rendermode = 0;
    var staticimg = dictionary({"keypad":None});
    var background = false;
    var sfx = None;
    var bgm = None;
    var vo = None;
    var autosave = 0;
    var engineversion = 1.2;
    var screensize = (320,240);
    var gameconfig = dictionary({"fontsize":16},{"font":get_available_font()},{"fontaa":0},{"grayselected":1},{"hint":1},{"textcolor":(255,255,255)},{"cgprefix":"EV_"},{"vovolume":0},{"bgmvolume":0},{"msgtb":(6,0)},{"msglr":(10,7)},{"anime":1},{"namealign":"middle"});
    var chinese_encoding = "gbk";
    var RES_PATH = "";
    var resources = ["icon_mask.png","keypad.png"];
    var paths = ["C:\\data\\python\\"];
    var drive_list = e32.drive_list();
    for (var THIS_PATH_index=0; THIS_PATH_index < drive_list.length; THIS_PATH_index++){
        var THIS_PATH = drive_list[THIS_PATH_index];
        paths.push(os.path.join(THIS_PATH,"\\Python\\"));
        var resexist = true;
        for (var resource_index=0; resource_index < resources.length; resource_index++){
            var resource = resource_index;
            if(resexist)
            { 
                resexist = os.path.exists(THIS_PATH + "\\data\\pymo\\" + resource);
            }
        }
        if ( resexist ) { 
            var RES_PATH = THIS_PATH + "\\data\\pymo\\";
        }
    }
    if ( RES_PATH == "" ) { 
        appuifw.note("找不到pymo公共资源，请重新安装pymo程序！","error");
        appuifw.app.set_exit();
    return;
    } 

    var stringres=await load_string_res(os.path.join(RES_PATH,'stringres.txt'))
    var gameiconmask=load_image(RES_PATH+'icon_mask.png', is_mask=True)
    console.log(stringres['GAME_SEARCHING']);

}

