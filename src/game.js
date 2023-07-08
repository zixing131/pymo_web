var gamedata = undefined;
var screensize=[240,320]
var save={}
var cache={} 
var cache={'bg':{},'chara':{},'vo':{},'bgm':{},'sel':None}
var cache_pos=0
var messagelog=[]
var withname=False
var running=True
var in_fade_out=False
var auto_play=False
var fade_out_color=[255,255,255]
var staticimg={}
var bgpakfile;
var bgindex;
var charapakfile
var charaindex
var sepakfile 
var seindex  
var vopakfile 
var voindex  
var gameconfig,running, bgsize, in_fade_out,final_img;
var final_img, canvas, rendermode, screensize, anime

Image.prototype.blit=async function(otherimg,target)
{
    new Promise((r,v)=>{ 
        var canvas1 = document.createElement('canvas');
        canvas1.width = this.width;
        canvas1.height = this.height;
        var ctx = canvas1.getContext('2d')
        ctx.drawImage(this, 0, 0, this.width, this.height);
        if(!target)
        {
            target=[0,,0]
        }
        ctx.drawImage(otherimg, target[0], target[1], otherimg.width, otherimg.height);
     
        let b64 = canvas1.toDataURL("image/jpeg", 1.0);
        this.load=function()
        {
            r();    
        }
        this.src = b64;
       
    })
}
Image.prototype.size=function()
{
    return [this.width,this.height];
}

maincanvas = document.getElementById('maincanvas')
var mainimg = document.getElementById('mainimg')

canvas={

    begin_redraw:function()
    {
        console.log('canvas.begin_redraw')
    },
     end_redraw:function()
    {
        console.log('canvas.end_redraw')
    },
    blit:async function(img,target)
    { new Promise((r,v)=>{ 
        if(!target)
        {
            target=[0,0]
        }
        console.log('canvas.blit')
        var ctx = maincanvas.getContext('2d')
        ctx.drawImage(img,target[0],target[1]) 
        r();
        // mainimg.load=function(){
        //     r();
        // }
        // mainimg.src=maincanvas.toDataURL("image/jpeg", 1.0);
        });
    }
} 

anime={
    ison:function(){
        return false;
    },
    redraw:function()
    {

    }
}

save['linenum']=0

async function loadGame(gamename)
{
    return await ZipStore.loadZip(gamename);
}

function get_image_width(img)
{
    return img.width;
}

function get_image_height(img)
{
    return img.height;
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
    try{
        var data = gamedata.Zip[filename].compressed_data;

        var pakfiletemp =new BinReader(data);
    
        var filecount = pakfiletemp.readInt();
        var fileindex = {}
        var i=0
        while(i< filecount)
        {
            var rawname=remove_null_end(pakfiletemp.read(32))
            var fileoffset= pakfiletemp.readInt();
            var filelength=pakfiletemp.readInt();
            fileindex[rawname]=[fileoffset,filelength]
            i+=1
        }
        //console.log(pakfile,fileindex)
        return [pakfiletemp,fileindex]
    }
    catch(err)
    {
        return [None,None]
    }
}

function processGameconfig(res)
{ 
    gameconfig = dictionary({"fontsize":16},{"font":get_available_font()},{"fontaa":0},{"grayselected":1},{"hint":1},{"textcolor":(255,255,255)},{"cgprefix":"EV_"},{"vovolume":0},{"bgmvolume":0},{"msgtb":(6,0)},{"msglr":(10,7)},{"anime":1},{"namealign":"middle"});
   
    var resp = res.split('\n')
    for(var i=0;i<resp.length;i++)
    {
        var resstr = resp[i];
        var resstrsp=resstr.split(',');
        if(resstrsp.length>=2)
        {
            var name = resstrsp[0];
            var value = resstrsp[1].trim();
            if(name=='imagesize' || name =='nameboxorig'){
                gameconfig[name]=[parseInt(resstrsp[1]),parseInt(resstrsp[2])]
            }else if(name=='msgtb' || name =='msgtb'){
                gameconfig[name]=[parseInt(resstrsp[1]),parseInt(resstrsp[2])]
            }else{  
                gameconfig[name]=value
            } 
        }
    }
    // if(!stringres['imagesize'])
    // {
    //     stringres['imagesize']=[320,240]
    // }
    return gameconfig;
} 


function purge_voice(isexit=False)
{

}

function purge_image(isexit=False,timelimit=0)
{

}

function SE_STP()
{

}
function save_global()
{

}

function purge_variable(){
    save_global()
    save['variables']={}
    load_global()
}

async function update_screen()
{
    if( rendermode==0)
    {
        if (anime.ison())
        {
            anime.redraw()
        } 
        else{
            await canvas.blit(final_img) 
        }
    } 
else{
    canvas.begin_redraw()
    if (anime.ison())
    {
        anime.redraw()
    }
        
    else{
        await canvas.blit(final_img)
    }
        
    if(staticimg['keypad'])
    {
        await  canvas.blit(staticimg['keypad'], target=(screensize[0],0))
    } 
        canvas.end_redraw()
    } 
}

function ALPHA(length, new_img, img_origin=[0,0]){

    draw_image(new_img,img_origin=img_origin)

}

async function draw_image(img,img_mask=None,img_origin=[0,0],on_canvas=True, on_final_img=True)
{
    if(img_mask==None)
    {
        if( on_final_img)
        {
            await final_img.blit(img, target=img_origin)
            if (on_canvas){
                update_screen()
            } 
        }else{
            if(on_canvas)
            {
                temp_img=new Image(final_img.size())
                await  temp_img.blit(final_img)
                await  final_img.blit(img, target=img_origin)
                update_screen()
                await  final_img.blit(temp_img)
            }
        }
    }else{
        if( on_final_img)
        {
            await  final_img.blit(img, target=img_origin)
            if (on_canvas){
                update_screen()
            } 
        }else{
            if(on_canvas)
            {
                temp_img=new Image(final_img.size())
                await  temp_img.blit(final_img)
                await  final_img.blit(img, target=img_origin)
                update_screen()
                await final_img.blit(temp_img)
            }
        }
    }
}

async function BGDisp(bgindex, transition='BG_NOFADE', speed='BG_NORMAL')
{
    var length=0;
    if(Number.isInteger(speed))
    {
        length=parseInt(speed)
    }
    else if(speed=='BG_VERYFAST')
    {
        length=10
    }
    else if(speed == 'BG_SLOW')
    {
        length=500
    }
    else {
        length=250
    }
    if(transition=='BG_NOFADE' || in_fade_out)
    {
        draw_image(staticimg['bg'],img_origin=bgorigin,on_canvas=!in_fade_out)
    }
    else if(transition=='BG_ALPHA')
    {
        ALPHA(length, staticimg['bg'], bgorigin)
    }
    else if(transition=='BG_FADE')
    {
        FADE(length)
        draw_image(staticimg['bg'],img_origin=bgorigin,on_canvas=!in_fade_out)
        FADE(length,is_fade_out=False)
    }
    else{
        var mask_path= 'system'+transition+'.png';
        var maskfile = gamedata.Zip[mask_path]
        if(maskfile)
        {
            MASK(length, staticimg['bg'], mask_img, bgorigin)
        }
        else{
            ALPHA(length, staticimg['bg'], bgorigin)
        }
    }
    await staticimg['bg_img'].blit(final_img,(0,0))
    chara_on=False
}
function change_script(filename)
{
    try{ 
        f = gamedata.Zip['script'+'/'+filename+'.txt'].compressed_data;
    }catch(err)
    { 
        f = gamedata.Zip['script'+'/'+filename.toUpperCase()+'.txt'].compressed_data;
    }
    f = new TextDecoder('utf-8').decode(f)
    console.log(f)
    f=f.split("\n")
    cache={'bg':{},'chara':{},'vo':{},'bgm':{},'sel':None}
    cache_pos=0
    save['linenum']=0
    purge_voice()
    purge_image()
    SE_STP()
    if(filename==gameconfig['startscript'])
    {
        purge_variable()
    } 

}

function split_parameter(str,command)
{
    args=str.substring(command.length).split(',')
    ret=[]
    for(r of args){
        ret.push(r.trim())
    }
    return ret;
}
function len(d)
{
    return d.length;
}
function SetEVFlag(a)
{
    console.log('SetEVFlag',a);
}
function CHASetInvisible()
{
    console.log('CHASetInvisible')
}
function del_blank(data)
{
    return data.trim()
}
//执行pymo脚本
async function ScriptParsePYMO()
{
    var indexf=0
    while(running)
    {
        if(indexf>=f.length)
        {
            break;
        }
        line=f[indexf]
        indexf++
        save['linenum']+=1
        // try{

        if(line.length==0)
        {
            break;
        }
        var command = line.trim();
        //change   
        if(command.startsWith('#change ')){
            change_script(del_blank(command.substring(8)))
            continue
        }
        //bg
        if(command.startsWith('#bg '))
        {
            arg = split_parameter(command,'#bg ')
            if(len(args)==1)
            {
                args.push('BG_ALPHA')
                args.push('300')
            }
            if(len(args)==3)
            {
                args.push('0')
                args.push('0')
            }
            if(args[0].startsWith(gameconfig['cgprefix']))
            {
                SetEVFlag(args[0]) 
            }
            await BGLoad(0,args[0],(parseFloat(args[3]),parseFloat(args[4])))
            await BGDisp(0,transition=args[1], speed=args[2])
            CHASetInvisible('a')
            continue
        }
              


        // }catch(err)
        // {
        //     console.error(err)
        // }

    }

}

function set_font()
{
    //设置字体
}

//读取存档
function load_global()
{

}

//解压文件，这里可以直接加载，不需要解压了
function unpack_file(filename, filetype)
{  
    var destfilename=filename.toUpperCase()
    var pakfile;
    var base_folder;
    var pakindex;
    if(filetype=='bgformat')
    {
        pakfile = bgpakfile
        base_folder = 'bg'
        pakindex = bgindex
    }
    else if(filetype=='charaformat' || filetype=='charamaskformat')
    {
        pakfile = charapakfile
        base_folder = 'chara'
        pakindex = charaindex
    }
    else if(filetype=='voiceformat')
    {
        pakfile = vopakfile
        base_folder = 'voice'
        pakindex = voindex
    }
    else if(filetype=='seformat')
    {
        pakfile = sepakfile
        base_folder = 'se'
        pakindex = seindex
    }else{
        return ''
    }

    var index =pakindex[destfilename]; 
    return pakfile.readAt(index[0],index[1]); 
    if(pakfile==None){
        full_filename = gameconfig[filetype]
        return full_filename
    }
    if(destfilename in pakindex)
    {
        //var pakfile =new BinReader(gameconfig[filetype]);
        return full_filename;
    }
    return '';
}

function load_image(imgfilenamedata, width=None, height=None, is_mask=False)
{
    return new Promise((resolve,reject)=>{

        try{ 
            var file = imgfilenamedata;
            var blob = new Blob([file], { type: "image/png" });
            var url = URL.createObjectURL(blob);   
            var myImage = new Image();
            myImage.src = url;
            if(width!=None && height!=None)
            {
            }
            else if(width==None && height!=None)
            { 
                width = height*myImage.width/myImage.height;
                
            }
            else if(width!=None && height==None)
            {
                height = witdh * myImage.height/myImage.width;
            }
            if(height!=None)
            {
                myImage.height = height;
            }
            if(width!=None)
            {
                myImage.width = width;
            } 
            myImage.onload=function()
            {
                resolve(myImage)
            }  
            myImage.onerror=function()
            {
                reject(myImage)
            } 
    
        }catch(err)
        {
            resolve(Image(screensize[0], screensize[1]));
        }
    }) 
    
}

async function BGLoad(bgindex,bgfilename,percentorig)
{  
    if(!percentorig)
    {
        percentorig=[0,0]
    }
    if(!('bg' in save) || (save['bg']!=bgfilename))
    {
        save['bg']=bgfilename
        if(bgfilename in cache['bg'])
        {
            staticimg['bg']=cache['bg'][bgfilename]['res']
            cache['bg'][bgfilename]['usetime']-=1
            if (cache['bg'][bgfilename]['usetime']==0){
                delete cache['bg'][bgfilename]
            }
           
        } else{
            full_filenamedata = unpack_file(bgfilename,'bgformat')
            staticimg['bg']=await load_image(full_filenamedata)
        }
    }
    save['bgpercentorig']=percentorig
    if(percentorig!=[0,0])
    {
        bgorigin=[ parseInt(-percentorig[0]*get_image_width(staticimg['bg'])/100) , parseInt(-percentorig[1]*get_image_height(staticimg['bg'])/100)]
    }
    else
    {
        bgorigin=[(screensize[0]-get_image_width(staticimg['bg']))/2, (screensize[1]-get_image_height(staticimg['bg']))/2]
    } 
}
function Load_system_images()
{
    
}

///加载游戏
async function loadgame(){
    // try{
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

        //游戏配置加载
        var gameconfig = gamedata.Zip['gameconfig.txt'];
        
        gameconfig = new TextDecoder('utf-8').decode(gameconfig.compressed_data); 
        gameconfig = processGameconfig(gameconfig)


        final_img=new Image(screensize[0],screensize[1]) 
        staticimg['bg_img']=new Image(screensize[0],screensize[1]) 
        staticimg['chara_img']=new Image(screensize[0],screensize[1]) 
        staticimg['oldimg']=new Image(screensize[0],screensize[1]) 
        staticimg['tempimg']=new Image(screensize[0],screensize[1]) 
        staticimg['paragraph_img']=new Image(screensize[0],screensize[1]) 
        staticimg['paragraph_img_mask']=new Image(screensize[0],screensize[1]) 

        chara={}
        cache={'bg':{},'chara':{},'vo':{},'bgm':{},'sel':None}
         cache_pos=0
         messagelog=[]
         withname=False
         running=True
         in_fade_out=False
         auto_play=False
         fade_out_color=(255,255,255)
        set_font()
        load_global()
        
        //calcute the blit origin of background image on the canvas
        //背景音乐
        var ret = load_pak_file("bg/bg.pak");
        bgpakfile=ret[0]
        bgindex = ret[1]

        console.log(gameconfig)
        var bgsize=gameconfig['imagesize']
        console.log(bgsize)
        var bgorigin=((screensize[0]-gameconfig['imagesize'][0])/2, (screensize[1]-gameconfig['imagesize'][1])/2)

        await BGLoad(0,'logo1')  
        await  BGDisp(0, transition='BG_ALPHA', speed='BG_NORMAL')
        Load_system_images();
        var ret = load_pak_file("chara/chara.pak");
        charapakfile=ret[0]
        charaindex = ret[1]
        var ret = load_pak_file("se/se.pak");
        sepakfile=ret[0]
        seindex = ret[1]
        
        await BGLoad(0,'logo2')
        await BGDisp(0, transition='BG_ALPHA', speed='BG_NORMAL')

      
        var ret = load_pak_file("voice/voice.pak");
        vopakfile=ret[0]
        voindex = ret[1]
 
        f = gamedata.Zip['script'+'/'+gameconfig['startscript']+'.txt'].compressed_data;
        f = new TextDecoder('utf-8').decode(f)
        console.log(f)
        f=f.split("\n")
        
        if(gameconfig['scripttype']=='mo1'){

        }
        if(gameconfig['scripttype']=='mo2'){

        } if(gameconfig['scripttype']=='pymo'){
            await ScriptParsePYMO();
        } 
    // }
    // catch(err)
    // {
    //     console.error(err)
    //     alert(err);
    // }
}

window.addEventListener("load", () => { 
    loadgame();
})
