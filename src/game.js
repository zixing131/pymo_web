const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
var gamedata = undefined;
var screensize=[320,240]
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
var chara_on
var gameconfig, bgsize, in_fade_out;
var final_img, canvas, rendermode, screensize, anime
var key_codes={
    EScancode1:1
}
var int = parseInt
var float = parseFloat

var time={
    clock:()=>{
        return (new Date().getTime()/1000);
    },
    time:()=>{
        return (new Date().getTime()/1000);
    }
}

var bytes2hex=(bytes)=>{
	let hex="",len=bytes.length;
    for(let i=0;i<len;i++){
    	let tmp,num=bytes[i];
        if(num<0){
        	tmp=(255+num+1).toString(16);
        }else{
        	tmp=num.toString(16);
        }
        if(tmp.length==1){
        	return "0"+tmp;
        }
        hex+=tmp;
    }
    return hex
}  


function MyImage(width,height){

    this.width = parseInt(width);
    this.height = parseInt(height);
    this.canv = document.createElement("canvas");
    this.canv.width = this.width;
    this.canv.height=this.height;
    //this.canv = this.canv.transferControlToOffscreen()
    this.ctx = this.canv.getContext('2d')

    this.saveLoad=function()
    { 
        var url = this.canv.toDataURL();   
        var img = new Image();
        img.src = url;  
        img.onload=function(){
            console.log("onlod")
        } 
        img.onerror=function(){
            console.log("onerror")
        } 
    }

    this.load=async function(filedata)
    { 
        var that =this;
       return new Promise((r,v)=>{ 
        try{
            var file = filedata;
            var blob = new Blob([file], { type: "image/png" });
            var url = URL.createObjectURL(blob);   
            var img = new Image();
            img.src = url; 
            img.onload=function()
            {
                that.canv.width = img.width;
                that.canv.height = img.height;
                that.ctx.drawImage(img, 0, 0); 
                that.width= parseInt(img.width);
                that.height= parseInt(img.height);
                r();
            }
            img.onerror=function()
            {
                v();
            } 
        }catch(err)
        {
            v();
        }
           
        })

    }
    this.resize = function(width,height)
    {
        var x = parseFloat(parseFloat(width)/parseFloat(this.width));
        var y = parseFloat(parseFloat(height)/parseFloat(this.height));
        
        this.width = width;
        this.height=height;
       
        var data=this.ctx.getImageData(0,0,this.width,this.height)
        // this.canv.setAttribute("width",width)
        // this.canv.setAttribute("height",height)
           this.canv.width = width;
          this.canv.height = height;
         this.ctx.putImageData(data,0,0)
         //console.log(x,y)
         this.ctx.scale(x,y)
    }

    this.blit = function(otherimg,target=[0,0],source=[0,0],mask)
    {
        if(!target)
        {
            target=[0,0]
        }
        if(target)
        {
            target[0]=parseInt( target[0])
            target[1]=parseInt( target[1])
        }
        if(!source)
        {
            source=[0,0]
        }
         
        //var imgdata = otherimg.ctx.getImageData(0,0,otherimg.width,otherimg.height) 
        var imgdata = otherimg.canv;
        //console.log(target,otherimg)
        if(mask)
        {  

            var bufferCanvas = document.createElement('canvas'),
            buffer = bufferCanvas.getContext('2d');
            var bufferCanvas2 = document.createElement('canvas')
            var buffer2 = bufferCanvas2.getContext('2d'),

            
            contents = null,
            
            alphaData = null;
            bufferCanvas2.width = otherimg.width;
            bufferCanvas2.height=otherimg.height;
            // set sizes to ensure all pixels are drawn to Canvas
            bufferCanvas.width = otherimg.width;
            bufferCanvas.height = otherimg.height * 2; 

                // draw the base image
                buffer.drawImage(otherimg.canv, 0, 0);
                
                // draw the mask directly below
                buffer.drawImage(mask.canv, 0, otherimg.height);

                // grab the pixel data for base image
                contents = buffer.getImageData(0, 0, otherimg.width,otherimg.height);
                
                // store mask data
                alphaData = buffer.getImageData(0, otherimg.height, otherimg.width, otherimg.height).data;
                    
                var len =  contents.data.length
                for (var i = 3; i < len; i = i + 4) {   
                        contents.data[i] = alphaData[i-1] 
                }
                buffer2.putImageData(contents,0,0);

                // this.ctx.fillStyle="#000000";  
                // this.ctx.beginPath();  
                // this.ctx.fillRect(target[0], target[1],otherimg.width,otherimg.height);  
                // this.ctx.closePath();   
 
                this.ctx.drawImage(bufferCanvas2,source[0],source[1],otherimg.width, otherimg.height, target[0], target[1], otherimg.width, otherimg.height); 
        }
        else{ 
            this.ctx.drawImage(imgdata,source[0],source[1],otherimg.width, otherimg.height, target[0], target[1],otherimg.width, otherimg.height); 
        }   
        //this.saveLoad();
        //this.ctx.save();
    }

    
    this.size = function(){
        return [this.width,this.height]
    }
    this.clear = function(color)
    {
        if(!color.toString().startsWith("#"))
        { 
            color = "#"+bytes2hex(color) 
        }
        this.ctx.fillStyle=color;  
        this.ctx.beginPath();  
        this.ctx.fillRect(0,0,this.width,this.height);  
        this.ctx.closePath();  
        this.ctx.save();
    }
    this.text = function(pos,text,fill,font)
    {   
        var color = fill;
        if(!fill.toString().startsWith("#"))
        { 
            color = "#"+bytes2hex(fill) 
        }
        this.ctx.font = font+"px sans-serif"
        //console.log(this.ctx.font,font+"px")
        this.ctx.fillStyle=color; 
        this.ctx.fillText(text,pos[0],pos[1]-2);      
        this.ctx.save();
    }
    return this;
}

var keyboard={
    is_down:function(scancode)
    {
        return false;
    },
    pressed:function(scancode)
    {
        return true;
    }
}
maincanvas = document.getElementById('maincanvas') 
var tempcanvas = document.createElement('canvas') 
var tempctx =  tempcanvas.getContext('2d')
canvas={

    begin_redraw:function()
    {
        //console.log('canvas.begin_redraw')
    },
     end_redraw:function()
    {
        //console.log('canvas.end_redraw')
    },
    blit:   function(img,target)
    { 
        if(!target)
        {
            target=[0,0]
        }
        //console.log('canvas.blit')
        var ctx = maincanvas.getContext('2d')
        ctx.drawImage(img.canv,target[0],target[1]) 
        
        // mainimg.onload=function(){
        //     r();
        // }
        // mainimg.src=maincanvas.toDataURL("image/jpeg", 1.0);
       
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

async  function loadGame(gamename)
{
    return  ZipStore.loadZip(gamename);
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

function todictionary(...arr)
{
    var ret = {} 
    for(var i=0;i<arr.length;i++)
    { 
        var arri = arr[i]
        for(var key in arri)
        {
            ret[key] = arri[key];
        }
       
    }
    return ret;
}
function processGameconfig(res)
{ 
    gameconfig = todictionary({"fontsize":16},{"font":get_available_font()},{"fontaa":0},{"grayselected":1},{"hint":1},{"textcolor":[255,255,255]},{"cgprefix":"EV_"},{"vovolume":0},{"bgmvolume":0},{"msgtb":[6,0]},{"msglr":[10,7]},{"anime":1},{"namealign":"middle"});
   
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
            }else if(name=='msgtb' || name =='msglr'){
                gameconfig[name]=[parseInt(resstrsp[1]),parseInt(resstrsp[2])]
            }else if(resstrsp.length>2)
            {
                gameconfig[name]=[parseInt(resstrsp[1]),parseInt(resstrsp[2])]
            }else{  
                var v= parseInt(value);
                if(Number.isNaN(v)){
                    gameconfig[name]=value
                }else
                {
                    gameconfig[name]=v
                } 
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

   function update_screen()
{
    if( rendermode==0)
    {
        if (anime.ison())
        {
            anime.redraw()
        } 
        else{
             canvas.blit(final_img) 
        }
    } 
else{
    canvas.begin_redraw()
    if (anime.ison())
    {
        anime.redraw()
    }
        
    else{
         canvas.blit(final_img)
    }
        
    if(staticimg['keypad'])
    {
          canvas.blit(staticimg['keypad'], (screensize[0],0))
    } 
        canvas.end_redraw()
    } 
}

   function ALPHA(length, new_img, img_origin=[0,0]){

    if  (length<20 || in_fade_out){
        draw_image(new_img,"",img_origin=img_origin, on_canvas=!in_fade_out)
         e32.ao_yield()
        return
    }
    length=parseFloat(length)/1000.0

    var fade_mask=  new MyImage(final_img.size()[0],final_img.size()[1])
    var oldimg=  new MyImage(final_img.size()[0],final_img.size()[1])
     oldimg.blit(final_img)

    var start_time=new Date().getTime()/1000
    var current_time=start_time
    var i=0
    while((current_time-start_time)<length)
    {
        var level = parseInt(255*(current_time-start_time)/length)
         fade_mask.clear([level,level,level])
         final_img.blit(oldimg)
           draw_image(new_img,img_mask=fade_mask,img_origin=img_origin)     

        i+=1
        current_time=new Date().getTime()/1000
    }

      draw_image(new_img,"",img_origin=img_origin) 
     e32.ao_yield()
}

function draw_image(img,img_mask=None,img_origin=[0,0],on_canvas=True, on_final_img=True)
{  
    if(img_mask==None || img_mask=="")
    {
        if( on_final_img)
        {
             final_img.blit(img,  img_origin)
            if (on_canvas){
                 update_screen()
            } 
        }else{
            if(on_canvas)
            {
                 var temp_img=  new MyImage(final_img.size()[0],final_img.size()[1])
                  temp_img.blit(final_img)
                  final_img.blit(img,  img_origin)
                 update_screen()
                  final_img.blit(temp_img)
                  delete temp_img
            }
        }
    }else{
        if( on_final_img)
        {
              final_img.blit(img, img_origin,"",img_mask)
              final_img.saveLoad()
            if (on_canvas){
                 update_screen()
            } 
        }else{
            if(on_canvas)
            {
                var temp_img=  new MyImage(final_img.size()[0],final_img.size()[1])
                  temp_img.blit(final_img)
                  final_img.blit(img,  img_origin,"",img_mask)
                 update_screen()
                 final_img.blit(temp_img)
                 delete temp_img
            }
        }
    }
}

   function draw_text(char_list,text_origin=[0,0],color=[255,255,255],on_canvas=True, on_final_img=True)
{
    var measure_result=measure_text(char_list)
    
    textrect = [measure_result.width,parseInt(gameconfig['fontsize'])]
     var  text_mask_img = new MyImage(textrect[0],textrect[1])
     text_mask_img.clear([0,0,0])
     text_mask_img.text([0,textrect[1]],char_list,fill=[255,255,255],font=gameconfig['fontsize'])
    
     var text_img = new MyImage(text_mask_img.size()[0],text_mask_img.size()[1])
     
     text_img.clear(color)
     //text_img.saveLoad()

    if(on_final_img)
    {
         final_img.blit(text_img, text_origin,"",text_mask_img)
         //final_img.saveLoad()
    }
    if(on_canvas)
    {
        if(rendermode==0)
        {
             canvas.blit(text_img, text_origin,"", text_mask_img)
        }
        else{
            canvas.begin_redraw()
              canvas.blit(text_img,  text_origin,"",text_mask_img)
            canvas.end_redraw()
        }
    } 
    delete text_mask_img
    delete text_img 
}

   function BGDisp(bgindex, transition='BG_NOFADE', speed='BG_NORMAL')
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
        draw_image(staticimg['bg'],"",img_origin=bgorigin,on_canvas=!in_fade_out)
    }
    else if(transition=='BG_ALPHA')
    {
         ALPHA(length, staticimg['bg'], bgorigin)
    }
    else if(transition=='BG_FADE')
    {
        FADE(length)
        draw_image(staticimg['bg'],"",img_origin=bgorigin,on_canvas=!in_fade_out)
        FADE(length,is_fade_out=False)
    }
    else{
        var mask_path= 'system/'+transition+'.png';
        var maskfile = gamedata.Zip[mask_path]
        if(maskfile)
        {
            MASK(length, staticimg['bg'], mask_img, bgorigin)
        }
        else{
             ALPHA(length, staticimg['bg'], bgorigin)
        }
    }
     staticimg['bg_img'].blit(final_img,(0,0))
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
    //console.log(f)
    f=f.split("\n")
    console.log(f)
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
var iswait = false;
async function waitkey()
{
    iswait=true;
    return new Promise((r,v)=>{
        var inval = setInterval(()=>{
            if(iswait==false)
            {
                clearInterval(inval);
                r();
            }
        },100);
    });
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
function CHASetInvisible(chaindex)
{
    if(chaindex=='a')
    {
        //#for save_element in save['chara']:
        //#    del save['chara'][save_element]['chara_visible']=False
        save['chara']={}
        chara={}

    }else{
        if (chaindex in save['chara'])
            {

                save['chara'][chaindex]['chara_visible']=False 
            }
    } 
}

function pos_bg2screen(pos_on_bg)
{
    return [pos_bg2screen_x(pos_on_bg[0]),pos_bg2screen_y(pos_on_bg[1])]
}

function pos_bg2screen_x(pos_on_bg_x){
    if(bgsize[0]==screensize[0])// #fit width, no need to change
    { 
        return pos_on_bg_x
    }
    else{
        return pos_on_bg_x+(screensize[0]-bgsize[0])/2    
    }
}

function pos_bg2screen_y(pos_on_bg_y){
    if (bgsize[1]==screensize[1])//: #fit height, no need to change
        return pos_on_bg_y
    else
        return pos_on_bg_y+(screensize[1]-bgsize[1])/2 
} 

function CHAOffsetPos(chaindex,offset)
{
    if(chaindex in save['chara']  &&  chaindex in chara)
    {
        chara[chaindex]['chara_origin']=pos_bg2screen([save['chara'][chaindex]['chara_center']-get_image_width(chara[chaindex]['chara_img'])/
2+offset[0], save['chara'][chaindex]['chara_y']+offset[1]])
    }
}

function CHAQuake(chaindex_list,offsets,cycle=100)
{
    if (! keyboard.is_down(key_codes.EScancode1))
    {
        var delay=float(cycle)/1000.0
        for (var offset of offsets)
        {
            start_time=time.time()
            realoffset=(int(offset[0]*screensize[0]/540),int(offset[1]*screensize[1]/360))
            for(var  chaindex of chaindex_list){ 
                CHAOffsetPos(chaindex,realoffset)
            }
            CHADisp(transition=None)
            end_time=time.time()
            if(end_time-start_time < delay)
            {

                e32.ao_sleep(delay-end_time+start_time)
            }
        }
    } 
}

function QUAKE()
{
    if(in_fade_out || keyboard.is_down(key_codes.EScancode1))
    { 
        return
    }
    staticimg['tempimg'].clear([0,0,0])
    delay=0.06
    img_origins=[[-1,-2],[4,3],[6,-4],[5,3],[2,-1],[0,0]]

    for (var img_origin of img_origins)
    {
        start_time=time.time()        
        draw_image(staticimg['tempimg'],None,None,on_canvas=False)
        draw_image(staticimg['oldimg'],None,img_origin=img_origin)
        end_time=time.time()
        if (end_time-start_time < delay){ 
            e32.ao_sleep(delay-end_time+start_time)
        }
    } 
}


function del_blank(data)
{
    return data.trim()
}

function delay_until(end_time)
{
    return;
}

   function  draw_chara()
{ 
    if(chara_on)
    {
        final_img.blit(staticimg['chara_img'],[0,0])
    }else{
        final_img.blit(staticimg['bg_img'],[0,0])
    }  
}  

function measure_text(name)
{
    tempctx.font = gameconfig['fontsize']+"px sans-serif"
    //console.log(tempctx.font ,gameconfig['fontsize']+"px sans-serif" )
    var ret = tempctx.measureText(name);
    var ret2 = {}
    ret2.width=ret.width;
    ret2.height=ret.height;
    if(!ret2.height || ret2.height==undefined)
    {
        ret2.height = gameconfig['fontsize'];
    }
    return ret2; 
}

   function message_before(name=None)
{
    //prepare the underlying img
     draw_chara()
     draw_image(staticimg['messagebox'],staticimg['messagebox_mask'],[0,screensize[1]-get_image_height(staticimg['messagebox'])],False)
    if(name==None)
    {
        save['name']=''
    }
    else {
        save['name']=name
        measure_result=measure_text(name)
        name_origin=[gameconfig['nameboxorig'][0],screensize[1]-get_image_height(staticimg['messagebox'])-gameconfig['nameboxorig'][1]-get_image_height(staticimg['message_name'])]
        
         if (gameconfig['namealign']=='left')
        {

            nametext_origin=[name_origin[0]+gameconfig['fontsize']/2,
            name_origin[1]+(get_image_height(staticimg['message_name'])-(measure_result.height))/2]
            console.log(nametext_origin,name)
        }
        else if( gameconfig['namealign']=='right')
        {

            nametext_origin=[name_origin[0]+get_image_width(staticimg['message_name'])-measure_result.width-gameconfig['fontsize']/2,
                             name_origin[1]+(get_image_height(staticimg['message_name'])-(measure_result.width-measure_result.height))/2]
        }
        else{
            nametext_origin=[name_origin[0]+(get_image_width(staticimg['message_name'])-measure_result.width)/2-1,name_origin[1]+(get_image_height(staticimg['message_name'])-(measure_result.height))/2]      
        } 
        draw_image(staticimg['message_name'],img_mask=staticimg['message_name_mask'],img_origin=name_origin,on_canvas=False)
         draw_text(name,nametext_origin,color=gameconfig['textcolor'],on_canvas=False)
    }
     update_screen()
} 

async   function draw_onebyone(charlist, topleft, bottomright, color, name, redrawmesagebox=True)
{

    var delay_time=[0.1,0.07,0.04,0.02,0,0]
    var i=0
    var line_num=0
    var textorigin=topleft
    var start_this_page=i
    var  key_pressed=False
    while(running && i<len(charlist))
    {  
        if(keyboard.pressed(key_codes.EScancodeSelect) || keyboard.pressed(key_codes.EScancode1)){
            key_pressed=True
        } 
        start_time=time.time()
        
        if(i<len(charlist)-1){
            if(charlist.substring(i,2)=='\\n' || charlist.substring(i,2)=='\\r')
            {
                update_screen()
                if(charlist.substring(i,2)=='\\n' && !keyboard.is_down(key_codes.EScancode1))
                {
                    display_cursor(textorigin)
                }
                key_pressed=False
                textorigin=[topleft[0], textorigin[1]+gameconfig['fontsize']+1]
                line_num+=1
                i+=2
                continue
            } 
        }  
        
        var measure_result=measure_text(charlist[i]) 
        if(bottomright[0]-textorigin[0] < measure_result.width){
            textorigin=[topleft[0], textorigin[1]+gameconfig['fontsize']+1]
            //console.log("textorigin",textorigin)
            line_num+=1
        }
        if( bottomright[1] < textorigin[1] + gameconfig['fontsize']*0.8)
        {
            //#display cursor
            if(!keyboard.is_down(key_codes.EScancode1))
            {
                display_cursor(textorigin,True)
            }
            if( 'textspeed' in gameconfig && gameconfig['textspeed']==5){
                    key_pressed=True
            }else{
                key_pressed=False
            }
            textorigin=topleft
            line_num=0
            if (redrawmesagebox)
            {
              message_before(name)
            }
            else{
                draw_chara()
            }
            start_this_page=i
        }
        //console.log(textorigin)
        draw_text(charlist[i],text_origin=textorigin,color=color,on_canvas=!key_pressed)
        textorigin=[textorigin[0]+measure_result.width,textorigin[1]]
        if (! key_pressed)
        {
            e32.ao_yield()
            end_time=time.time()
            if (end_time-start_time < delay_time[gameconfig['textspeed']]){
                await e32.ao_sleep(delay_time[gameconfig['textspeed']]-end_time+start_time)
            } 
        } 
        i++;
    }
     update_screen()

     if (textorigin[0] < bottomright[0]-gameconfig['fontsize']){

        textorigin=[textorigin[0]+3,textorigin[1]]
     }
    else{
        textorigin=[topleft[0],textorigin[1]+gameconfig['fontsize']+1]
    }
    
    return textorigin

}


async   function display_cursor(cursororigin, wait_for_vo=False)
{
    var space=[0,1,3,5,6,5,3,1]
    start_time=time.clock()

    var back_img=  new MyImage(get_image_width(staticimg['message_cursor']),get_image_height(staticimg['message_cursor'])+Math.max(...space))
    //back_img.clear([0,0,0]) 
    back_img.blit(final_img,[0,0],cursororigin)  
     //back_img.saveLoad()
     //console.log(back_img,cursororigin,final_img)
     draw_image(staticimg['message_cursor'],img_mask=staticimg['message_cursor_mask'],img_origin=cursororigin)
    e32.ao_yield()
    var i=0 
   
    var temp_img=  new MyImage(back_img.size()[0],back_img.size()[1])
    // if gameconfig['prefetching']:
    //     Prefetching()
    //     if (vo!=None and vo.state()==EPlaying and gameconfig['vovolume']>0):
    //         Prefetching()
    
    iswait=True;
    while(running)
    {
        if(!iswait)
        {
            break;
        } 
        origin=[0,space[i]]
        //console.log(origin)
        temp_img.blit(back_img)
         temp_img.blit(staticimg['message_cursor'],origin,"", staticimg['message_cursor_mask']) 
        
         //console.log(cursororigin)  
         draw_image(temp_img,img_mask=None,img_origin=cursororigin)
        await e32.ao_sleep(0.1)
        i=(i+1)%len(space)
    }
     draw_image(back_img,"",img_origin=cursororigin)
}

async  function SCROLL(length, bgfilename, startpos, endpos)
{
    var need_draw_chara;
    if(chara_on && save['bg']==bgfilename)
    {
        need_draw_chara=true
    }
    else{
        CHASetInvisible('a')
        chara_on=False
        need_draw_chara=False 
    }
    await BGLoad(0,bgfilename)

    if(keyboard.is_down(key_codes.EScancode1))
    {
        length=0.01
    }else{
        length=parseFloat(length)/1000.0
    }
    save['bgpercentorig']=endpos
    startpos=[parseInt(startpos[0]*get_image_width(staticimg['bg'])/100),parseInt(startpos[1]*get_image_height(staticimg['bg'])/100)]
    endpos=[parseInt(endpos[0]*get_image_width(staticimg['bg'])/100),parseInt(endpos[1]*get_image_height(staticimg['bg'])/100)]
    //#draw charas on bg if any
    if (need_draw_chara)
    {
        bgwithchara=  new MyImage(staticimg['bg'].size()[0],staticimg['bg'].size()[1])
        bgwithchara.blit(staticimg['bg'],[0,0])

        chaindexseq=[]
        for(chaindex of save['chara']){
            if (!('layer' in save['chara'][chaindex]))
            {
                save['chara'][chaindex]['layer']=1
            }
            chaindexseq.push([chaindex,save['chara'][chaindex]['layer']])
        }
        //这里需要排序
        //chaindexseq.sort(key=x:x[1])
        chaindexseq=sortData(chaindexseq)
        for( chaindexentry of chaindexseq)
        {
            chaindex=chaindexentry[0]
            if (save['chara'][chaindex]['chara_visible'])
            {
                img_origin=[startpos[0]+chara[chaindex]['chara_origin'][0],startpos[1]+chara[chaindex]['chara_origin'][1]]
                bgwithchara.blit(chara[chaindex]['chara_img'],img_origin,"",chara[chaindex]['chara_mask'])
            }
            chara[chaindex]['chara_origin']=[startpos[0]-endpos[0]+chara[chaindex]['chara_origin'][0],startpos[1]-endpos[1]+chara[chaindex]['chara_origin'][1]]
            save['chara'][chaindex]['chara_center']+=startpos[0]-endpos[0]
            save['chara'][chaindex]['chara_y']+=startpos[1]-endpos[1]
        } 
    }else{
        bgwithchara=staticimg['bg']
    }
    img_origin=startpos
    start_time=new Date().getTime()/1000
    current_time=start_time
    while ((current_time-start_time)<length)
    {
        xpos=(endpos[0]-startpos[0])*(current_time-start_time)/length
        ypos=(endpos[1]-startpos[1])*(current_time-start_time)/length
        img_origin=[-startpos[0]-xpos,-startpos[1]-ypos]
        draw_image(bgwithchara,"",img_origin=img_origin)
        current_time=new Date().getTime()/1000
    }
    draw_image(bgwithchara,"",img_origin=[-endpos[0],-endpos[1]])
    if(need_draw_chara)
    { 
        staticimg['chara_img'].blit(bgwithchara,[endpos,(endpos[0]+screensize[0],endpos[1]+screensize[1])])
    }
    staticimg['bg_img'].blit(staticimg['bg'],[endpos,(endpos[0]+screensize[0],endpos[1]+screensize[1])])
    e32.ao_yield()
}

async function message(charlist,name=None)
{
    if(charlist=='')
    {
        return;
    }
    var consttextorigin=[parseInt(gameconfig['msglr'][0]),screensize[1]-get_image_height(staticimg['messagebox'])+gameconfig['msgtb'][0]]
    var constbottomright=[screensize[0]-gameconfig['msglr'][1],screensize[1]-gameconfig['msgtb'][1]]

     message_before(name)

    textorigin=await draw_onebyone(charlist, consttextorigin, constbottomright, gameconfig['textcolor'], name)
    console.log(textorigin)
    await display_cursor(textorigin,True) 
     message_after(charlist,name)
}

function hexstr2color(string)
{
    var rgbint=16777215
    try{
         rgbint=parseInt(string.substring(1), 16)
    }
    catch(err)
    {
        rgbint=16777215
    }
    return [parseInt(rgbint / 256 / 256 % 256), parseInt(rgbint/ 256 % 256),parseInt(rgbint % 256)]
}

function Flush(colorstr,speed=0)
{
    if(in_fade_out)
    {
        return;
    }
    if (colorstr=='RED'){
        color=[255,0,0]
    }
    else if(colorstr=='WHITE')
    {
        color=[255,255,255]
    }
    else if(colorstr=='BLUE')
    {
        color=[0,0,255]
    } 
    else{
        color=hexstr2color(colorstr)
    }

    staticimg['tempimg'].blit(final_img,[0,0])
    final_img.clear(color)
    update_screen()
    if(speed)
    {
        e32.ao_sleep(speed/1000.0)
    }
    draw_image(staticimg['tempimg'])
}

function FADE(length, color=None, is_fade_out=True)
{
    if(keyboard.is_down(key_codes.EScancode1) || length<10)
    {
        length=10
    }
    else if(length>10000)
    {
        length=10000
    }
    if(!color){
        if(is_fade_out)
        {
            color = [0,0,0]
        }
        else {
            color=fade_out_color
        }
    }

    staticimg['tempimg'].clear(color)

    staticimg['oldimg'].blit(final_img,[0,0])
    if (is_fade_out)
    {
    fade_out_color=color
    ALPHA(length, staticimg['tempimg'])
    in_fade_out=True
    }
    else{
        in_fade_out=False
        draw_image(staticimg['tempimg'],None,None,on_canvas=False)
        ALPHA(length, staticimg['oldimg'])
        //allow_redraw=True
}       
}

function str_percent2pos(percent,full_len)
{
    return int(float(percent)*float(full_len)/100.0)
}

function CHAResetPos(chaindex)
{
    if(chaindex=='a')
    {
        for(var save_element in save['chara'])
        {
            save['chara'][save_element]['chara_center']=bgsize[0]/2
        }
    }
    else{
        if(chaindex in save['chara'])
        {
            save['chara'][chaindex]['chara_center']=bgsize[0]/2
        }
    } 
}
async function CHAload(chaindex, chafilename)
{
    chara[chaindex]={}
    if(!(chaindex in save['chara']))
    {
        save['chara'][chaindex]={}
    }
    save['chara'][chaindex]['filename']=chafilename
    
    if(!('chara_center' in save['chara'][chaindex]))
    {
        save['chara'][chaindex]['chara_center']=screensize[0]/2
    }
    if(chafilename in  cache['chara'])
    {
        chara[chaindex]['chara_img']=cache['chara'][chafilename]['res']
        chara[chaindex]['chara_mask']=cache['chara'][chafilename]['res_mask']
        cache['chara'][chafilename]['usetime']-=1
        if( cache['chara'][chafilename]['usetime']==0)
        { 
            delete cache['chara'][chafilename]
        } 
    }else{
        full_filename = unpack_file(chafilename,'charaformat')
        full_maskname = unpack_file(chafilename+'_mask','charaformat')
        chara[chaindex]['chara_img']=await load_image(full_filename)
        chara[chaindex]['chara_mask']=await load_image(full_maskname,None,None, is_mask=True)
    }
    save['chara'][chaindex]['chara_visible']=False 
}

function get_image_size(img){
    return [img.width,img.height]
}
function CHASetVisible(chaindex)
{
    if(chaindex in save['chara'])
    {       
         save['chara'][chaindex]['chara_visible']=True
    }
}

function CHAScroll(chaindex, length, startpos, endpos, beginalpha, mode)
{
    if(beginalpha>50)
    {
        var fade_mask=new MyImage(chara[chaindex]['chara_mask'].size()[0],chara[chaindex]['chara_mask'].size()[1])
        var bak_mask=new MyImage(chara[chaindex]['chara_mask'].size()[0],chara[chaindex]['chara_mask'].size()[1])
        bak_mask.blit(chara[chaindex]['chara_mask'])
    }
    if( keyboard.is_down(key_codes.EScancode1))
    { 
        length=0.01
    }
    else{
        length=float(length)/1000.0
    }
    var  start_time=time.clock()
    current_time=start_time
    if(beginalpha<=50)
    {
        //#no alpha transition
        while ((current_time-start_time)<length)
        {
            xpos=startpos[0]+(endpos[0]-startpos[0])*(current_time-start_time)/length
            ypos=startpos[1]+(endpos[1]-startpos[1])*(current_time-start_time)/length
            CHASetPos(chaindex,xpos,ypos,mode)
            CHADisp(None)
            current_time=time.clock()
        }
    }
    else{
        ///#with alpha transition
        while ((current_time-start_time)<length){
            xpos=startpos[0]+(endpos[0]-startpos[0])*(current_time-start_time)/length
            ypos=startpos[1]+(endpos[1]-startpos[1])*(current_time-start_time)/length
            level=(255-beginalpha)+int( beginalpha*(current_time-start_time)/length)
            fade_mask.clear([level,level,level])
            chara[chaindex]['chara_mask'].clear([0,0,0])
            chara[chaindex]['chara_mask'].blit(bak_mask,None,None, mask=fade_mask)
            CHASetPos(chaindex,xpos,ypos,mode)
            CHADisp(transition=None)
            current_time=time.clock()
        }
        chara[chaindex]['chara_mask'].blit(bak_mask)
    }
    CHASetPos(chaindex,endpos[0],endpos[1],mode)
    CHADisp(transition=None)
    e32.ao_yield()
}

function  CHASetLayer(chaindex,layer)
{
    if(!(chaindex in save['chara']))
    {
        return
    }
    save['chara'][chaindex]['layer']=layer
}
/*
#set the position of chara. mode 0:upperleft, mode 1:uppermiddle, mode 2:upperright, 
#                                             mode 3:middlemiddle, 
#                           mode 4:lowerleft, mode 5:lowermiddle, mode 6:lowerright
*/
function CHASetPos(chaindex,xpos,ypos=0,mode=5)
{
    if(!(chaindex in save['chara']))
    {
        return
    }
    var charasize=get_image_size(chara[chaindex]['chara_img'])

    //#save['chara'][chaindex]['chara_center'] is the x pos of chara center on bg
    //#save['chara'][chaindex]['chara_y'] is the distance of chara top to the bg top

    if(mode==5)
    {
        save['chara'][chaindex]['chara_center']=xpos
        save['chara'][chaindex]['chara_y']=bgsize[1]-charasize[1]-ypos
    } 
    else if( mode==0)
    {
        save['chara'][chaindex]['chara_center']=xpos+charasize[0]/2
        save['chara'][chaindex]['chara_y']=ypos
    }
    else if( mode==1){
        save['chara'][chaindex]['chara_center']=xpos
        save['chara'][chaindex]['chara_y']=ypos
    }
    else if( mode==2){
        save['chara'][chaindex]['chara_center']=bgsize[0]-xpos-charasize[0]/2
        save['chara'][chaindex]['chara_y']=ypos
    }
    else if( mode==3){
        save['chara'][chaindex]['chara_center']=xpos
        save['chara'][chaindex]['chara_y']=ypos-charasize[1]/2
    }
    else if( mode==4){
        save['chara'][chaindex]['chara_center']=xpos+charasize[0]/2
        save['chara'][chaindex]['chara_y']=bgsize[1]-charasize[1]-ypos
    }
    else{//(mode==6
        save['chara'][chaindex]['chara_center']=bgsize[0]-xpos-charasize[0]/2
        save['chara'][chaindex]['chara_y']=bgsize[1]-charasize[1]-ypos
    }
    chara[chaindex]['chara_origin']=pos_bg2screen([save['chara'][chaindex]['chara_center']-charasize[0]/2, save['chara'][chaindex]['chara_y']])
 
}
  

//执行pymo脚本
async   function ScriptParsePYMO()
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
        console.log(command)
        //change   
        if(command.startsWith('#change ')){
            change_script(del_blank(command.substring(8)))
            indexf=0;
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
            await  BGLoad(0,args[0],(parseFloat(args[3]),parseFloat(args[4])))
             BGDisp(0,transition=args[1], speed=args[2])
            CHASetInvisible('a')
            continue
        }
        
        //#scroll B34a,0,0,100,0,10000
        if(command.startsWith('#scroll '))
        {
            args=split_parameter(command,'#scroll ')
            await SCROLL(parseInt(args[5]),args[0],startpos=[parseFloat(args[1]),parseFloat(args[2])],endpos=[parseFloat(args[3]),parseFloat(args[4])])
            if(args[0].startsWith(gameconfig['cgprefix']))
            {
                SetEVFlag(args[0])
            } 
            continue
        } 

        //#flash #FF0000,1000

        if(command.startsWith('#flash '))
        {
            args=split_parameter(command,'#flash ')
            if (len(args)==1)
            { 
                args.push('0')
            }
            Flush(args[0],parseInt(args[1]))
            continue
        }

// #fade_out #000000,1000
      if(command.startsWith('#fade_out '))
      {
        args=split_parameter(command,'#fade_out ')
        if (len(args)<2)
            args.push('1000')
        FADE(parseInt(args[1]), color=hexstr2color(args[0]))
        continue
      }

      //#fade_in 1000

        if(command.startsWith('#fade_in '))
    {
        args=split_parameter(command,'#fade_in ')
        if (Number.isInteger(parseInt(args[0])) )
        {
            FADE(parseInt(args[0]),None,False)
        } 
        else{
            FADE(1000,None,False)
        }
        continue

    }

        //#chara 0,SM02AMA,25,1,1,SN01AMA,75,2,400
        if(command.startsWith('#chara '))
        {
            args=split_parameter(command,'#chara ')

            for(var i=0;i<len(args)-1;i+=4)
            {
                if(args[i+1].toUpperCase()=='NULL')
                {
                    CHASetInvisible(args[i])
                    CHAResetPos(args[i])
                }else{
                    await CHAload(args[i],args[i+1])
                    CHASetPos(args[i],str_percent2pos(args[i+2],bgsize[0]))
                    CHASetLayer(args[i],parseInt(args[i+3]))
                    CHASetVisible(args[i])
                }
            }
            CHADisp(None,int(args[len(args)-1]))
            continue 
        }
        // #chara_y 3,0,SM02AMA,25,10,1,1,SN01AMA,75,20,2,400

         if(command.startsWith('#chara_y '))
        {
            args=split_parameter(command,'#chara_y ')

                for(var i=0;i<len(args)-1;i+=5)
            {
                if(args[i+1].toUpperCase()=='NULL')
                {
                    CHASetInvisible(args[i])
                    CHAResetPos(args[i])
                }else{
                    if (! (args[i] in save['chara']))
                    { 
                        save['chara'][args[i]]={} 
                    }
                    await CHAload(args[i],args[i+1]) 
                    CHASetPos(args[i],str_percent2pos(args[i+2],bgsize[0]),str_percent2pos(args[i+3],bgsize[1]),int(args[0]))
                    CHASetLayer(args[i],int(args[i+4]))
                    CHASetVisible(args[i])
                }
            }
            CHADisp(length=int(args[len(args)-1]))
            continue
        }
        //#chara_scroll 5,0,SM02AMA,0,0,50,0,130,1,400
        //#chara_scroll 5,0,50,0,400
        if(command.startsWith('#chara_scroll '))
        { 
            args=split_parameter(command,'#chara_scroll ')
            if (len(args)==10)
            {
                if(! (args[1] in save['chara']))
                {
                    save['chara'][args[1]]={}
                }
                CHAload(args[1],args[2])
                CHASetLayer(args[1],int(args[8]))
                CHASetVisible(args[1])
                CHAScroll(args[1], int(args[9]), (str_percent2pos(args[3],bgsize[0]),str_percent2pos(args[4],bgsize[1])),
                          (str_percent2pos(args[5],bgsize[0]),str_percent2pos(args[6],bgsize[1])), int(args[7]), int(args[0]))
            }
            continue
        }

        //#chara_pos 0,43
        if(command.startsWith('#chara_pos '))
        {
            args=split_parameter(command,'#chara_pos ')
            if (len(args)==2){
                args.push('0')
                args.push('5')
            }
                
            CHASetPos(args[0],str_percent2pos(args[1],bgsize[0]),str_percent2pos(args[2],bgsize[1]),int(args[3]))
            CHADisp(transition=None)
            continue
        }
        //#chara_cls
        if(command.startsWith('#chara_cls '))
        {
            args=split_parameter(command,'#chara_cls ')
            CHASetInvisible(args[0])
            CHAResetPos(args[0])
            if( len(args)<2)
            {
                CHADisp() 
            }
            else{
                CHADisp(None,length=int(args[1]))
            }
            continue
         }

         //#chara_quake 0,1

         if (command.startsWith('#chara_quake '))
         {
            args=split_parameter(command,'#chara_quake ')
            CHAQuake(args,[[-10,3],[10,3],[-6,2],[5,2],[-4,1],[3,0],[-1,0],[0,0]])
            continue 
         } 

         //#chara_down 0,1
         if (command.startsWith('#chara_down '))
         {
            args=split_parameter(command,'#chara_quake ')
            CHAQuake(args,[[0,7],[0,16],[0,12],[0,16],[0,7],[0,0]])
            continue 
         } 
         //#chara_up 0,1
         if (command.startsWith('#chara_up '))
         {
            args=split_parameter(command,'#chara_quake ')
            CHAQuake(args,[[[0,-16],[0,0],[0,-6],[0,0]]])
            continue 
         } 
         //#chara_anime 0,1
         if (command.startsWith('#chara_anime '))
         {
            args=split_parameter(command,'#chara_anime ')
                offsets=[]
                j=int(args[2])
                while(j>0)
                {
                    for(var i=3;i<len(args);i+=2)
                    { 
                        offsets.push([float(args[i]),float(args[i+1])])
                    } 
                j-=1
                    } 
                CHAQuake([args[0]],offsets,int(args[1]))
                continue
         }
         
         // #quake
         if (command.startsWith('#quake'))
         { 
            QUAKE()
            continue   
         }


         //waitkey
         if (command.startsWith('#waitkey'))
         {
            await waitkey()
            continue
         } 
         
         if (command.startsWith('#wait '))
         {
            args=split_parameter(command,'#wait ')
             sleep(parseFloat(args[0]))
            continue 
         }

         if (command.startsWith('#waittime '))
         {
            args=split_parameter(command,'#waittime ')
             delay_until(parseInt(args[0]))
            continue 
         } 

         if (command.startsWith('#say '))
         {
            args=split_parameter(command,'#say ')
            if (len(args)==1)
            {
               await  message(args[0])
            }else{
               await  message(args[1],args[0])
            }  
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

async function load_image(imgfilenamedata, width=None, height=None, is_mask=False)
{
    if(typeof(imgfilenamedata) == typeof(""))
    {
        imgfilenamedata = gamedata.Zip[imgfilenamedata].compressed_data;
    }
    var myImage  = new MyImage();
    await myImage.load(imgfilenamedata);
    if(width)
    {
        width=parseInt(width)
    }
    if(height)
    {
        height=parseInt(height)
    }
    if(width!=None && height!=None)
    {
        
    }
    else if(width==None && height!=None)
    { 
        width = height*myImage.width/myImage.height; 
    }
    else if(width!=None && height==None)
    {
        height = width * myImage.height/myImage.width; 
    }
    else{
        width = myImage.width
        height = myImage.height   
    }
    if(Number.isNaN(height))
    {
        //height=width;
    }
    height = parseInt(height)
    width =  parseInt(width)
    if(height!=None && !Number.isNaN(height))
    {
        myImage.height = height;
    }
    if(width!=None && Number.isNaN(width))
    {
        myImage.width = width;
    } 
    console.log(width ,height)
    myImage.resize(width ,height);
    return myImage;  
}

function sortData(data)
{
    for(var i=0;i<data.length;i++)
    {
        for(var j=i+1;j<data.length;j++)
        {
            if(data[i][0]>data[j][0])
            {
                var t=data[i]
                data[i]=data[j]
                data[j]=t
            }
        }
    }
    return data
}


function CHADisp(transition='ALPHA',length=300)
{
    chara_on=False
    staticimg['oldimg'].blit(final_img,[0,0])
    draw_image(staticimg['bg_img'],None,None,on_canvas=False)

    chaindexseq=[]

    //#smallest layer number is at the bottom

    for(var chaindex in save['chara'])
    {
        if(!('layer' in save['chara'][chaindex]))
        {
            save['chara'][chaindex]['layer']=1
        }
        chaindexseq.push([chaindex,save['chara'][chaindex]['layer']])
    }
    console.log(chaindexseq)
    chaindexseq = sortData(chaindexseq)
    console.log(chaindexseq)
    for (var chaindexentry of chaindexseq)
    {
        var chaindex=chaindexentry[0]
        console.log(chaindex,save['chara'])
        if (save['chara'][chaindex]['chara_visible'])
        {
            draw_image(chara[chaindex]['chara_img'],img_mask=chara[chaindex]['chara_mask'],img_origin=chara[chaindex]['chara_origin'],on_canvas=False)
            chara_on=True
        }
    }
    staticimg['chara_img'].blit(final_img,[0,0])
    if(! in_fade_out)
    {
        if (transition=='ALPHA'){
            final_img.blit(staticimg['oldimg'],[0,0])
            ALPHA(length, staticimg['chara_img'])
        } 
        else{ 
            update_screen()
        }
    }
    chara_on=True
}

async   function BGLoad(bgindex,bgfilename,percentorig)
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
            staticimg['bg']= await  load_image(full_filenamedata)
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

//自动保存
function auto_save()
{

}

   function message_after(char_list,name=None){
     update_screen()
    save['message']=char_list
    //AppendMessageLog(name,char_list)
     auto_save()
    e32.ao_yield()
    //#set inactivity time to 0 to keep the screen light on
    //e32.reset_inactivity()
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
        
        gamedata= await loadGame(gamename);
        console.log(gamedata);

        //游戏配置加载
        var gameconfig = gamedata.Zip['gameconfig.txt'];
        
        gameconfig = new TextDecoder('utf-8').decode(gameconfig.compressed_data); 
        gameconfig = processGameconfig(gameconfig)


        final_img=  new MyImage(screensize[0],screensize[1]) 
        staticimg['bg_img']=  new MyImage(screensize[0],screensize[1]) 
        staticimg['chara_img']=  new MyImage(screensize[0],screensize[1]) 
        staticimg['oldimg']=  new MyImage(screensize[0],screensize[1]) 
        staticimg['tempimg']=  new MyImage(screensize[0],screensize[1]) 
        staticimg['paragraph_img']=  new MyImage(screensize[0],screensize[1]) 
        staticimg['paragraph_img_mask']=  new MyImage(screensize[0],screensize[1]) 

        staticimg['message_cursor']= await load_image('system/message_cursor.png', None, height=gameconfig['fontsize'])
        staticimg['message_cursor_mask']= await  load_image('system/message_cursor_mask.png',None,  height=gameconfig['fontsize'], is_mask=True)
        //#load option image
        staticimg['menuimg']= await  load_image('system/menu.png')

        var msgbox='message'
        staticimg['messagebox']=  await load_image('system/'+msgbox+'.png',width=screensize[0])
        var namebox="name"
        staticimg['messagebox_mask']=  await load_image('system/'+msgbox+'_mask.png', width=screensize[0],None, is_mask=True)
        //#load message name box
        staticimg['message_name']= await  load_image('system/'+namebox+'.png',None,  height=gameconfig['fontsize']+12)
        staticimg['message_name_mask']=  await load_image('system/'+namebox+'_mask.png',None,  height=gameconfig['fontsize']+12, is_mask=True)

        chara={}
        cache={'bg':{},'chara':{},'vo':{},'bgm':{},'sel':None}
         cache_pos=0
         messagelog=[]
         withname=False
         running=True
         in_fade_out=False
         auto_play=False
         fade_out_color=[255,255,255]
        set_font()
        load_global() 
        //calcute the blit origin of background image on the canvas
        //背景音乐
        var ret = load_pak_file("bg/bg.pak");
        bgpakfile=ret[0]
        bgindex = ret[1]

        console.log(gameconfig)
        bgsize=gameconfig['imagesize']
        console.log(bgsize)
        var bgorigin=[(screensize[0]-gameconfig['imagesize'][0])/2, (screensize[1]-gameconfig['imagesize'][1])/2]

        await  BGLoad(0,'logo1')  
          BGDisp(0, transition='BG_ALPHA', speed='BG_NORMAL')
        Load_system_images();
        var ret = load_pak_file("chara/chara.pak");
        charapakfile=ret[0]
        charaindex = ret[1]
        var ret = load_pak_file("se/se.pak");
        sepakfile=ret[0]
        seindex = ret[1]
        
        await  BGLoad(0,'logo2')
         BGDisp(0, transition='BG_ALPHA', speed='BG_NORMAL')

      
        var ret = load_pak_file("voice/voice.pak");
        vopakfile=ret[0]
        voindex = ret[1]
 
        f = gamedata.Zip['script'+'/'+gameconfig['startscript']+'.txt'].compressed_data;
        f = new TextDecoder('utf-8').decode(f)
        //console.log(f)
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

window.addEventListener("load",async () => { 
    await loadgame();
})


function handleKeydown(e) { 
    switch (e.key) { 
        case "ArrowDown":
            iswait=false;
            break; 
    }
}

window.addEventListener('keydown', handleKeydown);
