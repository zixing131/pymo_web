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
var textfont=20
var gameconfig,running, bgsize, in_fade_out,final_img;
var final_img, canvas, rendermode, screensize, anime
var key_codes={
    EScancode1:1
}
/**
	@private
	@name applyCanvasMask
	@function
	@description Use Canvas to apply an Alpha Mask to an <img>. Preload images first.
	@param {object} [image] The <img> to apply the mask
	@param {object} [mask] The <img> containing the PNG-24 mask image
	@param {int} [width] The width of the image (should be the same as the mask)
	@param {int} [height] The height of the image (should be the same as the mask)
	@param {boolean} [asBase64] Option to return the image as Base64
*/
function applyCanvasMask(image, mask, width, height, asBase64) {
	// check we have Canvas, and return the unmasked image if not
	if (!document.createElement('canvas').getContext && !asBase64) {
		return image;
	}
	else if (!document.createElement('canvas').getContext && asBase64) {
		return image.src;
	}
	
	var bufferCanvas = document.createElement('canvas'),
		buffer = bufferCanvas.getContext('2d'),
		outputCanvas = document.createElement('canvas'),
		output = outputCanvas.getContext('2d'),
		
		contents = null,
		imageData = null,
		alphaData = null;
		
	// set sizes to ensure all pixels are drawn to Canvas
	bufferCanvas.width = width;
	bufferCanvas.height = height * 2;
	outputCanvas.width = width;
	outputCanvas.height = height;
		
	// draw the base image
	buffer.drawImage(image, 0, 0);
	
	// draw the mask directly below
	buffer.drawImage(mask, 0, height);

	// grab the pixel data for base image
	contents = buffer.getImageData(0, 0, width, height);
	
	// store pixel data array seperately so we can manipulate
	imageData = contents.data;
	
	// store mask data
	alphaData = buffer.getImageData(0, height, width, height).data;
	
	// loop through alpha mask and apply alpha values to base image
	for (var i = 3, len = imageData.length; i < len; i = i + 4) {

		if (imageData[i] > alphaData[i]) {
			imageData[i] = alphaData[i]
		}
			
	}

	// return the pixel data with alpha values applied
	if (asBase64) {
		output.clearRect(0, 0, width, height);
		output.putImageData(contents, 0, 0);
		
		return outputCanvas.toDataURL();
	}
	else {
		return contents;	
	}
}

Image.prototype.blit=async function(otherimg,target,source,mask)
{
    return new Promise((r,v)=>{ 
        if(mask)
        {
            var data = applyCanvasMask(otherimg,mask,otherimg.width, otherimg.height,true)
            this.onload=function()
            {
                r();    
            }
            this.src = data;
            return;
        }
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
       
        this.onload=function()
        {
            r();    
        }
        this.src = b64;
       
    })
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
Image.prototype.size=function()
{
    return [this.width,this.height];
}

Image.prototype.clear=function(color)
{
    return new Promise((r,v)=>{ 
        var canvas1 = document.createElement('canvas');
        canvas1.width = this.width;
        canvas1.height = this.height;
        var ctx = canvas1.getContext('2d')
        color = "#"+bytes2hex(color)
        ctx.fillStyle=color;  
        ctx.beginPath();  
        ctx.fillRect(0,0,canvas1.width,canvas1.height);  
        ctx.closePath();  
        let b64 = canvas1.toDataURL("image/jpeg", 1.0);
        this.onload=function()
        {
            r();    
        } 
        this.onerror=function()
        {
            v();    
        }
        this.src = b64; 
    })
}

Image.prototype.text=function(pos,text,fill,font)
{
    return new Promise((r,v)=>{ 
        var canvas1 = document.createElement('canvas');
        canvas1.width = this.width;
        canvas1.height = this.height;
        var ctx = canvas1.getContext('2d')
        color = "#"+bytes2hex(fill)
        ctx.fillStyle=color;
        ctx.fillText(text,pos[0],pos[1]);        
        let b64 = canvas1.toDataURL("image/jpeg", 1.0);
        this.onload=function()
        {
            r();    
        } 
        this.onerror=function()
        {
            v();    
        }
        this.src = b64; 
    })
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
var mainimg = document.getElementById('mainimg')

canvas={

    begin_redraw:function()
    {
        //console.log('canvas.begin_redraw')
    },
     end_redraw:function()
    {
        //console.log('canvas.end_redraw')
    },
    blit:async function(img,target)
    { new Promise((r,v)=>{ 
        if(!target)
        {
            target=[0,0]
        }
        //console.log('canvas.blit')
        var ctx = maincanvas.getContext('2d')
        ctx.drawImage(img,target[0],target[1]) 
        r();
        // mainimg.onload=function(){
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

async function ALPHA(length, new_img, img_origin=[0,0]){

    if  (length<20 || in_fade_out){
        draw_image(new_img,img_origin=img_origin, on_canvas=!in_fade_out)
        await e32.ao_yield()
        return
    }
    length=parseFloat(length)/1000.0

    var fade_mask=new Image(final_img.size()[0],final_img.size()[1])
    var oldimg=new Image(final_img.size()[0],final_img.size()[1])
    oldimg.blit(final_img)

    var start_time=new Date().getTime()/1000
    var current_time=start_time
    var i=0
    while((current_time-start_time)<length)
    {
        var level = parseInt(255*(current_time-start_time)/length)
        await fade_mask.clear([level,level,level])
        final_img.blit(oldimg)
        draw_image(new_img,img_mask=fade_mask,img_origin=img_origin)     

        i+=1
        current_time=new Date().getTime()/1000
    }

    draw_image(new_img,img_origin=img_origin) 
    await e32.ao_yield()
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
            await  final_img.blit(img, target=img_origin,mask = img_mask)
            if (on_canvas){
                update_screen()
            } 
        }else{
            if(on_canvas)
            {
                temp_img=new Image(final_img.size())
                await  temp_img.blit(final_img)
                await  final_img.blit(img, target=img_origin,mask = img_mask)
                update_screen()
                await final_img.blit(temp_img)
            }
        }
    }
}

async function draw_text(char_list,text_origin=[0,0],color=[255,255,255],on_canvas=True, on_final_img=True)
{
    textrect = [char_list.length* parseInt(gameconfig['fontsize']),gameconfig['fontsize']]
    var  text_mask_img = new Image(textrect[0],textrect[1])
    await text_mask_img . clear([0,0,0])
    await text_mask_img.text((0,textrect[1]),char_list,fill=(255,255,255),font=textfont)

    if(on_final_img)
    {
        await final_img.blit(text_mask_img, target=text_origin)
    }
    if(on_canvas)
    {
        if(rendermode==0)
        {
            canvas.blit(text_mask_img, target=text_origin)
        }
        else{
            canvas.begin_redraw()
            canvas.blit(text_mask_img, target=text_origin)
            canvas.end_redraw()
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
        await ALPHA(length, staticimg['bg'], bgorigin)
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
            await ALPHA(length, staticimg['bg'], bgorigin)
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
var iswait = false;
function waitkey()
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
function CHASetInvisible()
{
    console.log('CHASetInvisible')
}
function del_blank(data)
{
    return data.trim()
}

function delay_until(end_time)
{
    return;
}

async function  draw_chara()
{ 
    if(chara_on)
    {
        await final_img.blit(staticimg['chara_img'],[0,0])
    }else{
        await  final_img.blit(staticimg['bg_img'],[0,0])
    }  
}  

function measure_text(name)
{
    return name;
}

async function message_before(name=None)
{
    //prepare the underlying img
    await draw_chara()
    await draw_image(staticimg['messagebox'],img_mask=staticimg['messagebox_mask'],img_origin=[0,screensize[1]-get_image_height(staticimg['messagebox'])],on_canvas=False)
    if(name==None)
    {
        save['name']=''
    }
    else {
        save['name']=name
        measure_result=measure_text(name)
        name_origin=[gameconfig['nameboxorig'][0],screensize[1]-get_image_height(staticimg['messagebox'])-gameconfig['nameboxorig'][1]-get_image_height(staticimg['message_name'])]
         
        // if gameconfig['namealign']=='left':
        //     nametext_origin=(name_origin[0]+gameconfig['fontsize']/2,
        //                      name_origin[1]+(get_image_height(staticimg['message_name'])-(measure_result[0][3]-measure_result[0][1]))/2)
        // elif gameconfig['namealign']=='right':
        //     nametext_origin=(name_origin[0]+get_image_width(staticimg['message_name'])-measure_result[1]-gameconfig['fontsize']/2,
        //                      name_origin[1]+(get_image_height(staticimg['message_name'])-(measure_result[0][3]-measure_result[0][1]))/2)
        // else:
        //     nametext_origin=(name_origin[0]+(get_image_width(staticimg['message_name'])-measure_result[1])/2-1,name_origin[1]+(get_image_height(staticimg['message_name'])-(measure_result[0][3]-measure_result[0][1]))/2)
        await draw_image(staticimg['message_name'],img_mask=staticimg['message_name_mask'],img_origin=name_origin,on_canvas=False)
        await draw_text(name,nametext_origin,color=gameconfig['textcolor'],on_canvas=False)
    }
    await update_screen()
}
function message_after()
{

}

async function draw_onebyone(charlist, topleft, bottomright, color, name=None, redrawmesagebox=True)
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
        start_time=new Date().getTime()/1000
        
        if(redrawmesagebox)
        {
            message_before(name)
        }else{
            draw_chara()
        } 
        await draw_text(charlist[i],text_origin=textorigin,color=color,on_canvas=!key_pressed)
        textorigin=[textorigin[0]+20,textorigin[1]]
        if (! key_pressed)
        {
            e32.ao_yield()
            end_time=new Date().getTime()/1000
            if (end_time-start_time < delay_time[gameconfig['textspeed']]){
                e32.ao_sleep(delay_time[gameconfig['textspeed']]-end_time+start_time)
            } 
        }   
        i++;
    }
    update_screen()
    return textorigin

}
function display_cursor()
{

}

function SCROLL(length, bgfilename, startpos, endpos)
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
    BGLoad(0,bgfilename)

    if(keyboard.is_down(key_codes.EScancode1))
    {
        length=0.01
    }else{
        length=parseFloat(length)/1000.0
    }
    save['bgpercentorig']=endpos
    startpos=(parseInt(startpos[0]*get_image_width(staticimg['bg'])/100),parseInt(startpos[1]*get_image_height(staticimg['bg'])/100))
    endpos=(parseInt(endpos[0]*get_image_width(staticimg['bg'])/100),parseInt(endpos[1]*get_image_height(staticimg['bg'])/100))
    //#draw charas on bg if any
    if (need_draw_chara)
    {
        bgwithchara=new Image(staticimg['bg'].size()[0],staticimg['bg'].size()[1])
        bgwithchara.blit(staticimg['bg'],target=(0,0))

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
        for( chaindexentry of chaindexseq)
        {
            chaindex=chaindexentry[0]
            if (save['chara'][chaindex]['chara_visible'])
            {
                img_origin=[startpos[0]+chara[chaindex]['chara_origin'][0],startpos[1]+chara[chaindex]['chara_origin'][1]]
                bgwithchara.blit(chara[chaindex]['chara_img'],target=img_origin,mask=chara[chaindex]['chara_mask'])
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
        draw_image(bgwithchara,img_origin=img_origin)
        current_time=new Date().getTime()/1000
    }
    draw_image(bgwithchara,img_origin=[-endpos[0],-endpos[1]])
    if(need_draw_chara)
    { 
        staticimg['chara_img'].blit(bgwithchara,source=[endpos,(endpos[0]+screensize[0],endpos[1]+screensize[1])])
    }
    staticimg['bg_img'].blit(staticimg['bg'],source=[endpos,(endpos[0]+screensize[0],endpos[1]+screensize[1])])
    e32.ao_yield()
}

async function message(charlist,name=None)
{
    if(charlist=='')
    {
        return;
    }
    var consttextorigin=[gameconfig['msglr'][0],screensize[1]-get_image_height(staticimg['messagebox'])+gameconfig['msgtb'][0]]
    var constbottomright=[screensize[0]-gameconfig['msglr'][1],screensize[1]-gameconfig['msgtb'][1]]

    await message_before(name)

    textorigin=await draw_onebyone(charlist, consttextorigin, constbottomright, gameconfig['textcolor'], name)
        display_cursor(textorigin,True)

    message_after(charlist,name)
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
        console.log(command)
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
        
        //#scroll B34a,0,0,100,0,10000
        if(command.startsWith('#scroll '))
        {
            args=split_parameter(command,'#scroll ')
            SCROLL(parseInt(args[5]),args[0],startpos=(parseFloat(args[1]),parseFloat(args[2])),endpos=(parseFloat(args[3]),parseFloat(args[4])))
            if(args[0].startsWith(gameconfig['cgprefix']))
            {
                SetEVFlag(args[0])
            } 
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
            await sleep(parseFloat(args[0]))
            continue 
         }

         if (command.startsWith('#waittime '))
         {
            args=split_parameter(command,'#waittime ')
            await delay_until(parseInt(args[0]))
            continue 
         } 

         if (command.startsWith('#say '))
         {
            args=split_parameter(command,'#say ')
            if (len(args)==1)
            {
                await message(args[0])
            }else{
                await message(args[1],name=args[0])
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

function load_image(imgfilenamedata, width=None, height=None, is_mask=False)
{
    if(typeof(imgfilenamedata) == typeof(""))
    {
        imgfilenamedata = gamedata.Zip[imgfilenamedata].compressed_data;
    }
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


function message_after(char_list,name=None){
    update_screen()
    save['message']=char_list
    //AppendMessageLog(name,char_list)
    //auto_save()
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

        var msgbox='message'
        staticimg['messagebox']=await load_image('system/'+msgbox+'.png')

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


function handleKeydown(e) { 
    switch (e.key) { 
        case "ArrowDown":
            iswait=false;
            break; 
    }
}

window.addEventListener('keydown', handleKeydown);
