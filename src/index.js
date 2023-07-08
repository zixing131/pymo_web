
mainmenulist = [ 
	["启动游戏",'opengame',],
	["刷新列表",'refreshGameList',],
    ["安装游戏",'installgame',],
	["删除游戏",'deletegame',],
    ["关于",'about',],
    ["退出",'exit'],
]

function myopengame(gamename)
{ 
    href='game.html?game='+gamename;  
    window.location.href = href;
}

function opengame()
{
	if(nowfocus)
	{ 
		var gamename = nowfocus.children[1].innerText;
		var gamemid = nowfocus.children[2].innerText;
		if(gamemid==null || gamemid=="")
		{
			showDialog("提示","游戏文件损坏！",closeDialog,closeDialog);    
			return;
		} 
		myopengame(gamename,gamemid);
	}
	else{
		
			showDialog("提示","请先选择一个游戏！",closeDialog,closeDialog);     
	}
}

function loadMenu()
{
    var menuitems = document.getElementById("menuitems")
    if(menuitems)
    {
        var menus = [];

        for(var i=0;i<mainmenulist.length;i++)
        {
            var nowitem = mainmenulist[i];
            var title = nowitem[0];
            var actionnow = nowitem[1];
            menus.push(' <div class="menuitem" focusable onclick="'+actionnow+'()" >' + title + '</div>');
            
        }
        menuitems.innerHTML = menus.join('');
    }
	
	var applist=document.getElementById("applist");
	var menuitems=applist.getElementsByClassName('menuitem');
	for(var i=0;i<menuitems;i++)
	{
		menuitems[i].removeAttribute("focusable")
	} 
} 

function installgame()
{
    document.getElementById("gameFileupload").click();
    var menu = document.getElementById("menu");
    menu.style.display="none"; 
    restoreMenuName();
}

function deletegame()
{
	
	if(nowfocus)
	{ 
		var gamename = nowfocus.children[1].innerText;
		ZipStore.deleteZip(gamename).then
		(
			()=>{ 
				showDialog("提示",gamename+"删除成功！",closeDialog,closeDialog);   
				refreshGameList();
		},  
			(errname)=>{
				showDialog("提示",errname+"删除失败！",closeDialog,closeDialog);     
			}
			); 
		}  
	else{
		showDialog("提示","请先选择一个游戏！",closeDialog,closeDialog);    
	}
}
  

var onUploadFile = function(e){
    const _files = e.target.files;
    if (_files.length == 0) {
        return;
    }
    const _file = _files[0];  
    if(!_file.name.toLowerCase().endsWith('.zip'))
    {
		showDialog("提示","只能上传zip格式!",closeDialog,closeDialog);   
        document.getElementById("ZipFileupload").value= null;
        return;
    }
    //fs.createUniqueFile("/Phone",_file.name,_file);
    const reader = new FileReader();
    reader.readAsArrayBuffer(_file);
    reader.onload = function(readRes){
        ZipStore.installGame(_file.name,readRes.target.result).then
        (
            ()=>{ 
				showDialog("提示",_file.name+"安装成功！",closeDialog,closeDialog);  
                refreshGameList();
        },  
            (errname)=>{
					showDialog("提示",errname+"安装失败！",closeDialog,closeDialog);   
            }
            );	
    document.getElementById("ZipFileupload").value= null;
    }    
}

var nowfocus=undefined; 
function disableAppList()
{
	var applist=document.getElementById('applist'); 
	
	nowfocus = applist.getElementsByClassName("focus")[0];
	
	var listitems=applist.getElementsByClassName("listitem");
	
	for(var i=0;i<listitems.length;i++)
	{
		listitems[i].removeAttribute("focusable")
	}
}
function enableApplist()
{
	var applist=document.getElementById('applist'); 
	var listitems=applist.getElementsByClassName("listitem");
	for(var i=0;i<listitems.length;i++)
	{
		listitems[i].setAttribute("focusable","")
	}
	if(nowfocus)
	{
		focusable.requestFocus(nowfocus)
	}
}

function processGameconfig(res)
{ 
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

function refreshGameList()
    {
        ZipStore.getAll().then(
            (files)=>{ 
                var applist=document.getElementById('applist'); 
                var listapp = [];
                for(var i=0;i<files.length;i++)
                {
					var res=files[i];
					try{ 
					var gameconfig = res.Zip['gameconfig.txt'];
                   
                    gameconfig=new TextDecoder('utf-8').decode(gameconfig.compressed_data);
                    console.log(gameconfig) 
                    gameconfig = processGameconfig(gameconfig)
                    var gametitle = gameconfig["gametitle"];
                    gametitle=gametitle.replaceAll('\\n','</br>')
					var iconfile = res.Zip["icon.png"];  
					var bytes = iconfile.compressed_data;
					var blob = new Blob([bytes], { type: "image/png" });
					var url = URL.createObjectURL(blob);  
                    var gamemid  = res.ZipName;
                    listapp.push(' <div class="listitem" focusable> <image class="gameicon" src="'+url+'"></image> <div id="gamename" style="display:none">'+res.ZipName+'</div> <div id="gamemid" style="display:none">'+gamemid+'</div> <div class="listtext">' + gametitle + '</div></div>');					
                
                }catch(err)
					{
						url=""
						listapp.push(' <div class="listitem" focusable> <image class="gameicon" src="'+url+'"></image> <div id="gamename" style="display:none">'+res.ZipName+'</div> <div id="gamemid" style="display:none"></div> <div class="listtext">' + res.gameName + '[文件损坏]</div></div>');
						console.log(err)
					}
                } 
                applist.innerHTML = listapp.join('');
            },
            (err)=>{
                alert(err);
            }
        );
    }

function loadLocalgame()
{
    
    var localgames=document.getElementById('localgames');
    if(localgames.options.length==0)
    {
		showDialog("提示","请先上传game!",closeDialog,closeDialog);   
        return;
    }
    if(localgames.selectedIndex<0 || localgames.selectedIndex>=localgames.options.length)
    {
		
		showDialog("提示","请选择game名称!",closeDialog,closeDialog);  
        return;
    }
    var gamename = localgames.options[localgames.selectedIndex].text;
    console.log(gamename);
    opengame(gamename,"",1);
    
}

window.addEventListener("load", () => { 
    document.getElementById("gameFileupload").addEventListener("change", onUploadFile); 
    refreshGameList(); 
})

function about()
{  
    showDialog("关于","kaios版本的pymo模拟器客户端  made by zixing！",closeDialog,closeDialog); 
}

function nav(d)
{
    var alertDialog = document.getElementById("alertDialog");
    if(alertDialog && alertDialog.style.display!="none")
    {
        var alerttext=document.getElementById("alerttext");
        var scrdata = d*20;
        alerttext.scrollTop+=scrdata;
    }

}

var lastEventLeft=undefined;
var lastEventRight=undefined;
var lastEventCenter=undefined;

//当前左右按键定义的函数
var nowEventLeft=lastEventLeft; 
var nowEventRight=lastEventRight;
var nowEventCenter=lastEventCenter;

//显示提示框
function showDialog(title,content,acceptevent,cancelevent)
{
    var alertheader=document.getElementById("alertheader")
    var alerttext=document.getElementById("alerttext")
    alertheader.innerText=title;
    alerttext.innerText = content;
    saveMenuName();
    setLeftKeyName("确定");
    setCenterKeyName("");
    setRightKeyName("取消"); 
	
    var alertDialog = document.getElementById("alertDialog")
    alertDialog.style.display = "block";

    saveEvent();

    nowEventLeft = acceptevent;
    nowEventRight = cancelevent; 
    nowEventCenter = acceptevent;

}

function saveEvent()
{
    lastEventLeft=nowEventLeft;
    lastEventRight=nowEventRight;
    lastEventCenter=nowEventCenter;
}
function restoreEvent()
{
    nowEventLeft=lastEventLeft; 
    nowEventRight=lastEventRight;
    nowEventCenter=lastEventCenter;
}
function closeDialog()
{
    var alertheader=document.getElementById("alertheader")
    var alerttext=document.getElementById("alerttext")
    alertheader.innerText="";
    alerttext.innerText = "";
    var alertDialog = document.getElementById("alertDialog")
    alertDialog.style.display = "none";
    restoreMenuName();
    restoreEvent();
}

function tab(d)
{

}

function setLeftKeyName(name)
{
    var element = document.getElementById("softkeyleft")
    if(element)
    {
        element.innerText = name;
    }
}


function setCenterKeyName(name)
{
    var element = document.getElementById("softkeycenter")
    if(element)
    { 
        element.innerText = name;
    }
}

function setRightKeyName(name)
{
    var element = document.getElementById("softkeyright")
    if(element)
    { 
        element.innerText = name;
    }
}

var lastleft=[];
var lastcenter=[];
var lastright=[];
function saveMenuName()
{ 
    var softkeyleft = document.getElementById("softkeyleft")
    
    var softkeycenter = document.getElementById("softkeycenter")
    
    var softkeyright = document.getElementById("softkeyright")

    lastleft.push(softkeyleft.innerText);
    lastcenter.push(softkeycenter.innerText);
    lastright.push(softkeyright.innerText);
     
}

function restoreMenuName()
{
    var softkeyleft = document.getElementById("softkeyleft")
    
    var softkeycenter = document.getElementById("softkeycenter")
    
    var softkeyright = document.getElementById("softkeyright")

	var p = lastleft.pop();
	if(p){
		softkeyleft.innerText = p;
		softkeycenter.innerText = lastcenter.pop();
		softkeyright.innerText =lastright.pop(); 
	}
     
}


function softleft()
{
    if(nowEventLeft)
    {
        nowEventLeft();
        return;
    }
    var menu = document.getElementById("menu");
    if(menu)
    {
        if(menu.style.display=="block")
        { 
            menu.style.display="none"; 
            restoreMenuName();
            var fc = document.getElementsByClassName("focus");
            if(fc && fc.length>0)
            {
                fc[0].click();
            }
			enableApplist();
        }
        else {
			
            loadMenu();
			disableAppList();
            saveMenuName();
            menu.style.display="block";    
            focusable.requestFocus(document.getElementsByClassName('menuitem')[0])
            setLeftKeyName("选择");
            setCenterKeyName("");
            setRightKeyName("返回"); 

        }
    }
}

function softcenter()
{
    if(nowEventCenter)
    {
        nowEventCenter();
        return;
    }
}

function exit(){ 
    
    showDialog("确认","是否确认退出？",()=>{ 
        closeDialog();
		window.close();
    },()=>{closeDialog()});
}

function softright()
{
    if(nowEventRight)
    {
        nowEventRight();
        return;
    }
    var menu = document.getElementById("menu");
    if(menu)
    {
        if(menu.style.display=="block")
        {
            restoreMenuName();
            menu.style.display="none";
			enableApplist();
        }
        else{
            exit();
        }
    }
}

function handleKeydown(e) {
    if (e.key != "EndCall" && e.key != "Backspace") {
        //e.preventDefault();//清除默认行为（滚动屏幕等） 
    } 
    switch (e.key) {
        case 'ArrowUp':
            nav(-1);
            break;
        case 'ArrowDown':
            nav(1);
            break;
        case 'ArrowRight':
            tab(1);
            break;
        case 'ArrowLeft':
            tab(-1);
            break;
        case 'Enter': 

            break;
        case 'Backspace': 
            break;
        case 'Q':
        case 'SoftLeft':
            softleft()
            break;
        case 'E':
        case 'SoftRight':
            softright()
            break;
    }
}

window.addEventListener('keydown', handleKeydown);

main();

