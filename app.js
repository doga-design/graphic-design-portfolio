/* Portfolio App , consolidated, deferred, optimized */
(function(){
"use strict";
var d=document,b=d.body,w=window;

/* ── Throttle helper ── */
function throttle(fn,ms){var t=0;return function(){var n=Date.now();if(n-t>=ms){t=n;fn()}}}

/* ── Scroll progress + page marker ── */
var progressLine=d.getElementById("csProgressLine"),
    pageMarker=d.getElementById("csPageMarker"),
    nextProjectBtn=d.getElementById("csNextProjectBtn"),
    prefersReduced=w.matchMedia("(prefers-reduced-motion:reduce)").matches;

function updateScroll(){
  if(!b.classList.contains("is-project-view"))return;
  if(progressLine){var h=d.documentElement.scrollHeight-w.innerHeight;progressLine.style.width=(h>0?(w.scrollY/h)*100:0)+"%"}
  if(pageMarker){if(w.scrollY<300)pageMarker.classList.remove("visible");else pageMarker.classList.add("visible")}
  if(nextProjectBtn&&!nextProjectBtn.classList.contains("d-none")){
    var nearBottom=w.scrollY+w.innerHeight>=d.documentElement.scrollHeight-120;
    if(nearBottom)nextProjectBtn.classList.add("at-bottom");else nextProjectBtn.classList.remove("at-bottom");
  }
}
w.addEventListener("scroll",throttle(updateScroll,16),{passive:true});

/* ── IntersectionObserver for .cs-reveal ── */
var revealObs=new IntersectionObserver(function(entries){
  for(var i=0;i<entries.length;i++){
    if(entries[i].isIntersecting){entries[i].target.classList.add("cs-revealed");revealObs.unobserve(entries[i].target)}
  }
},{threshold:0.08,rootMargin:"0px 0px -80px 0px"});

function observeReveals(root){
  var els=root.querySelectorAll(".cs-reveal");
  for(var i=0;i<els.length;i++){
    if(prefersReduced)els[i].classList.add("cs-revealed");
    else revealObs.observe(els[i]);
  }
}

/* ── DOM Ready ── */
d.addEventListener("DOMContentLoaded",function(){
  var homeSection=d.getElementById("home"),
      projectSections=d.querySelectorAll(".project-page"),
      projectLinks=d.querySelectorAll(".project-link"),
      homeLinks=d.querySelectorAll("[data-go-home]");

  /* dd-inline-image-row expand overlay */
  var ddExpand=d.getElementById("dd-inline-expand"),
      ddExpandImg=ddExpand&&ddExpand.querySelector(".dd-inline-expand-img"),
      ddExpandClose=ddExpand&&ddExpand.querySelector(".dd-inline-expand-close");
  function closeDDExpand(){
    if(!ddExpand)return;
    ddExpand.classList.remove("active");
    b.style.overflow="";
    ddExpand.setAttribute("aria-hidden","true");
  }
  if(ddExpand&&ddExpandImg){
    d.querySelectorAll(".dd-inline-image-row img").forEach(function(img){
      img.addEventListener("click",function(){
        ddExpandImg.src=this.src;
        ddExpandImg.alt=this.alt;
        ddExpand.classList.add("active");
        b.style.overflow="hidden";
        ddExpand.setAttribute("aria-hidden","false");
      });
    });
    ddExpand.addEventListener("click",function(e){if(e.target===ddExpand)closeDDExpand()});
    if(ddExpandClose)ddExpandClose.addEventListener("click",closeDDExpand);
    d.addEventListener("keydown",function(e){if(ddExpand.classList.contains("active")&&e.key==="Escape")closeDDExpand()});
  }

  /* ── Filter logic ── */
  var filterLinks=d.querySelectorAll(".filter-link"),
      cards=d.querySelectorAll(".work-card");
  // Mark originally hidden cards once so we can restore them when going back to "all"
  cards.forEach(function(c){
    if(c.classList.contains("work-card--hidden"))c.dataset.originallyHidden="1";
  });
  filterLinks.forEach(function(link){
    link.addEventListener("click",function(e){
      e.preventDefault();
      filterLinks.forEach(function(l){l.classList.remove("active")});
      link.classList.add("active");
      var f=link.dataset.filter;
      cards.forEach(function(c){
        // Restore hidden state for originally-hidden unrevealed cards before each filter run
        if(c.dataset.originallyHidden&&!c.classList.contains("work-card--revealed")){
          c.classList.add("work-card--hidden");
        }
        c.classList.remove("d-none");
        if(f!=="all"){
          if(c.dataset.category===f){
            c.classList.remove("work-card--hidden"); // force-show matching hidden cards
          }else{
            c.classList.add("d-none"); // hide non-matching
          }
        }
      });
    });
  });

  /* ── View switching ── */
  function showHome(){
    homeSection.classList.remove("d-none");
    projectSections.forEach(function(s){s.classList.add("d-none")});
    b.classList.remove("is-project-view");
    w.scrollTo({top:0,behavior:"smooth"});
    if(progressLine)progressLine.style.width="0%";
    if(pageMarker)pageMarker.classList.remove("visible");
    if(nextProjectBtn)nextProjectBtn.classList.add("d-none");
  }
  function showProject(id){
    homeSection.classList.add("d-none");
    projectSections.forEach(function(s){s.classList.toggle("d-none",s.id!==id)});
    b.classList.add("is-project-view");
    w.scrollTo({top:0,behavior:"smooth"});
    if(progressLine)progressLine.style.width="0%";
    var sec=d.getElementById(id);
    if(sec&&pageMarker){pageMarker.textContent=sec.dataset.projectName||"";pageMarker.classList.remove("visible")}
    if(nextProjectBtn){
      var nextLink=sec?sec.querySelector(".cs-footer-nav a.project-link[data-project]"):null;
      var showNext=id==="project-visual-platform"||id==="project-ferns-sons"||id==="project-bountt"||id==="project-visugenie"||id==="project-rgd-distro-disco";
      if(showNext&&nextLink){
        nextProjectBtn.href=nextLink.getAttribute("href")||"#";
        nextProjectBtn.dataset.project=nextLink.dataset.project||"";
        nextProjectBtn.classList.remove("d-none");
        nextProjectBtn.classList.remove("at-bottom");
      }else nextProjectBtn.classList.add("d-none");
    }
    if(sec){
      var cover=sec.querySelector(".cs-cover");
      if(cover){cover.classList.remove("cs-animate");void cover.offsetWidth;cover.classList.add("cs-animate")}
      sec.querySelectorAll(".cs-reveal").forEach(function(el){el.classList.remove("cs-revealed")});
      requestAnimationFrame(function(){observeReveals(sec)});
    }
  }

  projectLinks.forEach(function(link){
    link.addEventListener("click",function(e){
      e.preventDefault();var id=link.dataset.project;
      if(id){showProject(id);history.pushState({page:id},"","#"+id)}
    });
  });
  homeLinks.forEach(function(link){
    link.addEventListener("click",function(e){
      e.preventDefault();showHome();history.pushState({page:"home"},"","#home");
    });
  });
  w.addEventListener("popstate",function(){
    var hash=location.hash.replace("#","");
    if(!hash||hash==="home")showHome();
    else{var s=d.getElementById(hash);if(s&&s.classList.contains("project-page"))showProject(hash);else showHome()}
  });

  /* Initial route */
  var h=location.hash.replace("#","");
  if(!h||h==="home")showHome();
  else{var s=d.getElementById(h);if(s&&s.classList.contains("project-page"))showProject(h);else showHome()}

  /* ── Hero GIF loaders ── */
  d.querySelectorAll(".hero-gif-loader").forEach(function(img){
    var gifSrc=img.getAttribute("data-gif");if(!gifSrc)return;
    var g=new Image();
    g.onload=function(){img.style.opacity="0.7";setTimeout(function(){img.src=gifSrc;img.style.opacity="1"},200)};
    g.src=gifSrc;
  });

  /* ── Scroll to top buttons ── */
  d.querySelectorAll(".scroll-to-top-btn").forEach(function(btn){
    btn.addEventListener("click",function(){w.scrollTo({top:0,behavior:"smooth"})});
  });

  /* ── Work cards expand / collapse ── */
  var workRevealBtn=d.getElementById("workRevealBtn"),
      workRevealText=workRevealBtn?workRevealBtn.querySelector(".work-reveal-btn-text"):null,
      hiddenCards=d.querySelectorAll(".work-card--hidden");
  if(workRevealBtn&&workRevealText&&hiddenCards.length){
    workRevealBtn.addEventListener("click",function(){
      var expanded=workRevealBtn.getAttribute("aria-expanded")==="true";
      if(expanded){
        hiddenCards.forEach(function(card){card.classList.remove("work-card--revealed")});
        workRevealBtn.setAttribute("aria-expanded","false");
        workRevealText.textContent="View all 7 projects";
        w.requestAnimationFrame(function(){
          w.scrollBy({top:-280,behavior:"smooth"});
        });
      }else{
        hiddenCards.forEach(function(card){card.classList.add("work-card--revealed")});
        workRevealBtn.setAttribute("aria-expanded","true");
        workRevealText.textContent="View less";
        w.requestAnimationFrame(function(){
          w.scrollBy({top:280,behavior:"smooth"});
        });
      }
    });
  }

  /* ── Hover GIFs (desktop) / auto-play GIFs (mobile) ── */
  var isTouch=!matchMedia("(hover:hover)").matches;
  var hoverGifs=d.querySelectorAll(".cs-hover-gif");
  if(!isTouch){
    hoverGifs.forEach(function(img){
      var gifSrc=img.getAttribute("data-gif"),staticSrc=img.src;
      if(!gifSrc)return;var loaded=false;
      img.addEventListener("mouseenter",function(){
        if(!loaded){var p=new Image();p.onload=function(){img.src=gifSrc;loaded=true};p.src=gifSrc}else img.src=gifSrc;
      });
      img.addEventListener("mouseleave",function(){img.src=staticSrc});
    });
  } else {
    var gifObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var img=entry.target,src=img.getAttribute("data-gif");
        if(src){var p=new Image();p.onload=function(){img.src=src};p.src=src}
        gifObs.unobserve(img);
      });
    },{threshold:0.1,rootMargin:"200px"});
    hoverGifs.forEach(function(img){gifObs.observe(img)});
  }

  /* Initial reveal observe */
  d.querySelectorAll(".project-page").forEach(function(p){observeReveals(p)});

  /* About Me photo card swap */
  var aboutFront=d.getElementById("aboutCardFront"),aboutBack=d.getElementById("aboutCardBack"),aboutBtn=d.getElementById("aboutSwapBtn"),aboutStack=d.querySelector(".about-card-stack"),aboutPhotos=d.getElementById("aboutPhotos"),aboutSwapCursor=d.getElementById("aboutSwapCursor"),desktopAboutCursor=w.matchMedia("(min-width: 769px)");
  if(aboutFront&&aboutBack&&aboutBtn&&aboutStack){
    function setAboutCursorPressed(pressed){
      if(!aboutSwapCursor||!desktopAboutCursor.matches)return;
      aboutSwapCursor.classList.toggle("about-swap-cursor--press",pressed);
      aboutSwapCursor.classList.toggle("about-swap-cursor--active",pressed);
    }
    function aboutSwap(){
      aboutFront.classList.toggle("about-card--swapped");
      aboutBack.classList.toggle("about-card--swapped");
      aboutBtn.classList.toggle("about-card-swap--rotated");
      if(aboutSwapCursor&&desktopAboutCursor.matches){
        aboutSwapCursor.classList.remove("about-swap-cursor--rotate");
        void aboutSwapCursor.offsetWidth;
        aboutSwapCursor.classList.add("about-swap-cursor--rotate");
        setTimeout(function(){aboutSwapCursor&&aboutSwapCursor.classList.remove("about-swap-cursor--rotate")},320);
      }
    }
    if(aboutSwapCursor){
      function moveAboutCursor(e){
        aboutSwapCursor.style.left=e.clientX+"px";
        aboutSwapCursor.style.top=e.clientY+"px";
      }
      aboutStack.addEventListener("mouseenter",function(e){
        if(!desktopAboutCursor.matches)return;
        if(aboutPhotos)aboutPhotos.classList.add("about-photos--stack-hover");
        aboutSwapCursor.classList.add("about-swap-cursor--visible");
        moveAboutCursor(e);
      });
      aboutStack.addEventListener("mousemove",function(e){
        if(!desktopAboutCursor.matches)return;
        moveAboutCursor(e);
      });
      aboutStack.addEventListener("mouseleave",function(){
        if(aboutPhotos)aboutPhotos.classList.remove("about-photos--stack-hover");
        setAboutCursorPressed(false);
        aboutSwapCursor.classList.remove("about-swap-cursor--visible","about-swap-cursor--rotate");
      });
    }
    aboutStack.addEventListener("pointerdown",function(){ setAboutCursorPressed(true); });
    aboutStack.addEventListener("pointerup",function(){ setAboutCursorPressed(false); });
    aboutStack.addEventListener("pointercancel",function(){ setAboutCursorPressed(false); });
    aboutBtn.addEventListener("click",aboutSwap);
    aboutBtn.addEventListener("pointerdown",function(){ setAboutCursorPressed(true); });
    aboutBtn.addEventListener("pointerup",function(){ setAboutCursorPressed(false); });
    aboutBtn.addEventListener("pointercancel",function(){ setAboutCursorPressed(false); });
    aboutStack.addEventListener("click",aboutSwap);
  }

  /* Pixel flower garden */
  var introGardenRoot=d.getElementById("intro-v2"),
      flowerGardenLayer=d.getElementById("flower-garden-layer"),
      flowerGardenCursor=d.getElementById("flowerGardenCursor");
  if(introGardenRoot&&flowerGardenLayer){
    var liveItems=introGardenRoot.querySelectorAll(".intro-v2-live-item"),
        flowerGardenCount=0,
        flowerGardenMax=40,
        flowerGardenDelay=3500,
        flowerGardenInterval=null,
        flowerGardenTriggered=false,
        flowerGardenIsTouchDevice=w.matchMedia("(hover: none)").matches||w.matchMedia("(pointer: coarse)").matches,
        flowerGardenUid=0,
        flowerGardenParticles=[],
        flowerGardenParticleRaf=0,
        flowerGardenPositions=[],
        flowerGardenSounds=["img/audio/Crop_place1.ogg.mp3","img/audio/Crop_place2.ogg.mp3","img/audio/Crop_place3.ogg.mp3","img/audio/Crop_place4.ogg.mp3","img/audio/Crop_place5.ogg.mp3","img/audio/Crop_place6.ogg.mp3"],
        flowerGardenSoundPool=[],
        flowerGardenAudioPrimed=false,
        flowerGardenMuted=false,
        flowerGardenDesktopCursor=w.matchMedia("(min-width: 769px)"),
        flowerGardenBodyGreens=["#075805","#63A000"],
        flowerGardenPetalPalette=["#FFDAB9","#B5EAD7","#C7CEEA","#FF4540","#A8DADC","#FFDFD3","#D4F1C0","#F9E4B7"],
        flowerGardenRareSpawnChance=0.2,
        flowerGardenRareSource={type:"image",width:32,height:32,headOffsetX:16,headOffsetY:12,src:"img/firefly-bush.png"},
        flowerGardenFireflyColors=["#FFE566","#FFF0A0","#FFFACD"],
        flowerGardenFireflies=[],
        flowerGardenFireflyRaf=0,
        flowerGardenCursorIcons={
          sound:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 6H5.2L8.2 3.5V12.5L5.2 10H2.5V6Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 6.1C10.9 6.45 11.15 6.97 11.15 7.5C11.15 8.03 10.9 8.55 10.5 8.9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12.35 4.85C13.08 5.55 13.5 6.5 13.5 7.5C13.5 8.5 13.08 9.45 12.35 10.15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
          mute:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 6H5.2L8.2 3.5V12.5L5.2 10H2.5V6Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.3 5.2L13.4 10.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M13.4 5.2L10.3 10.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
        },
        flowerGardenSources=[
          {
            width:20,
            height:41,
            headOffsetX:10,
            headOffsetY:31,
            svg:`<svg width="20" height="41" viewBox="0 0 20 41" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_995_620)"><path d="M7 7H5V12H7V7Z" fill="#FF4540"/><path d="M15 7H13V12H15V7Z" fill="#FF4540"/><path d="M11 16H9V18H11V16Z" fill="#FF4540"/><path d="M11 18H9V25H11V18Z" fill="#63A000"/><path d="M9 8H11V10H9V8Z" fill="#FF4540"/><path d="M9 10H7V12H9V10Z" fill="#FF4540"/><path d="M5 12H7V14H5V12Z" fill="#FF4540"/><path d="M7 14H9V16H7V14Z" fill="#FF4540"/><path d="M5 14H7V16H5V14Z" fill="#FF4540"/><path d="M11 10H13V12H11V10Z" fill="#FF4540"/><path d="M13 12H15V14H13V12Z" fill="#FF4540"/><path d="M16 21H20V25H16V21Z" fill="#63A000"/><path d="M0 21H4V25H0V21Z" fill="#63A000"/><path d="M11 14H13V16H11V14Z" fill="#FF4540"/><path d="M14 23H16V25H14V23Z" fill="#63A000"/><path d="M6 25H8V27H6V25Z" fill="#63A000"/><path d="M13 25H15V27H13V25Z" fill="#63A000"/><path d="M16 21H18V23H16V21Z" fill="#63A000"/><path d="M6 29H14V31H6V29Z" fill="#63A000"/><path d="M4 27H16V29H4V27Z" fill="#63A000"/><path d="M4 23H6V25H4V23Z" fill="#63A000"/><path d="M2 21H4V23H2V21Z" fill="#63A000"/><path d="M2 25H18V27H2V25Z" fill="#63A000"/><path d="M9 31H11V41H9V31Z" fill="#63A000"/><path d="M13 14H15V16H13V14Z" fill="#FF4540"/></g><defs><clipPath id="clip0_995_620"><rect width="20" height="41" fill="white"/></clipPath></defs></svg>`
          },
          {
            width:20,
            height:41,
            headOffsetX:10,
            headOffsetY:31,
            svg:`<svg width="20" height="41" viewBox="0 0 20 41" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_995_647)"><path d="M6 6H4V11H6V6Z" fill="#FEDC97"/><path d="M16 6H14V11H16V6Z" fill="#FEDC97"/><path d="M11 6H9V11H11V6Z" fill="#FEDC97"/><path d="M11 17H9V25H11V17Z" fill="#075805"/><path d="M0 9H2V11H0V9Z" fill="#FEDC97"/><path d="M2 11H4V13H2V11Z" fill="#FEDC97"/><path d="M6 15H14V17H6V15Z" fill="#FEDC97"/><path d="M4 13H6V15H4V13Z" fill="#FEDC97"/><path d="M18 9H20V11H18V9Z" fill="#FEDC97"/><path d="M16 11H18V13H16V11Z" fill="#FEDC97"/><path d="M16 22H20V26H16V22Z" fill="#075805"/><path d="M0 22H4V26H0V22Z" fill="#075805"/><path d="M14 13H16V15H14V13Z" fill="#FEDC97"/><path d="M14 24H16V26H14V24Z" fill="#075805"/><path d="M6 29H14V31H6V29Z" fill="#075805"/><path d="M4 27H16V29H4V27Z" fill="#075805"/><path d="M4 24H6V26H4V24Z" fill="#075805"/><path d="M2 25H18V27H2V25Z" fill="#075805"/><path d="M9 31H11V41H9V31Z" fill="#075805"/><path d="M6 11H14V13H6V11Z" fill="#FEDC97"/></g><defs><clipPath id="clip0_995_647"><rect width="20" height="41" fill="white"/></clipPath></defs></svg>`
          },
          {
            width:28,
            height:41,
            headOffsetX:14,
            headOffsetY:28,
            svg:`<svg width="28" height="41" viewBox="0 0 28 41" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_995_669)"><path d="M16 29H18V41H16V29Z" fill="#63A000"/><path d="M22 21H26V25H22V21Z" fill="#63A000"/><path d="M12 11H16V25H12V11Z" fill="#FEDC97"/><path d="M0 21H2V23H0V21Z" fill="#63A000"/><path d="M26 21H28V23H26V21Z" fill="#63A000"/><path d="M20 13H22V15H20V13Z" fill="#FEDC97"/><path d="M6 13H8V15H6V13Z" fill="#FEDC97"/><path d="M18 13H20V17H18V13Z" fill="#FEDC97"/><path d="M8 13H10V17H8V13Z" fill="#FEDC97"/><path d="M2 21H6V25H2V21Z" fill="#63A000"/><path d="M18 25H20V31H18V25Z" fill="#63A000"/><path d="M6 23H8V29H6V23Z" fill="#63A000"/><path d="M8 25H10V31H8V25Z" fill="#63A000"/><path d="M16 15H18V23H16V15Z" fill="#FEDC97"/><path d="M10 15H12V23H10V15Z" fill="#FEDC97"/><path d="M20 23H22V29H20V23Z" fill="#63A000"/><path d="M8 37H10V41H8V37Z" fill="#63A000"/><path d="M18 37H20V41H18V37Z" fill="#63A000"/><path d="M20 35H22V39H20V35Z" fill="#63A000"/><path d="M22 33H24H26V37H22V33Z" fill="#63A000"/><path d="M26 35H28V39H26V35Z" fill="#63A000"/><path d="M0 35H2V39H0V35Z" fill="#63A000"/><path d="M2 33H6V37H2V33Z" fill="#63A000"/><path d="M6 35H8V39H6V35Z" fill="#63A000"/><path d="M10 29H12V41H10V29Z" fill="#63A000"/></g><defs><clipPath id="clip0_995_669"><rect width="28" height="41" fill="white"/></clipPath></defs></svg>`
          }
        ];
    if(flowerGardenIsTouchDevice)flowerGardenMax=8;

    function flowerGardenRandomItem(list){
      return list[Math.floor(Math.random()*list.length)];
    }
    function flowerGardenClamp(value,min,max){
      return Math.min(max,Math.max(min,value));
    }
    function flowerGardenAccentColor(){
      var accent=getComputedStyle(d.documentElement).getPropertyValue("--accent").trim();
      return accent||"#B8A9FF";
    }
    function flowerGardenHexToRgba(hex,alpha){
      var safe=(hex||"").replace("#","");
      if(safe.length===3)safe=safe.replace(/(.)/g,"$1$1");
      var r=parseInt(safe.slice(0,2),16),
          g=parseInt(safe.slice(2,4),16),
          bl=parseInt(safe.slice(4,6),16);
      return "rgba("+r+","+g+","+bl+","+alpha+")";
    }
    function flowerGardenRecolorSvg(source,petalColor,bodyColor){
      var uid="flower-garden-clip-"+(++flowerGardenUid),
          greens={"#075805":true,"#63A000":true},
          svg=source.replace(/clip0_[^")]+/g,uid);
      return svg.replace(/fill="(#[0-9A-Fa-f]{6})"/g,function(match,color){
        var normalized=color.toUpperCase();
        return 'fill="'+(greens[normalized]?bodyColor:petalColor)+'"';
      });
    }
    function flowerGardenUpdateCursorIcon(){
      if(!flowerGardenCursor)return;
      flowerGardenCursor.innerHTML=flowerGardenMuted?flowerGardenCursorIcons.mute:flowerGardenCursorIcons.sound;
      flowerGardenCursor.classList.toggle("about-swap-cursor--active",flowerGardenMuted);
    }
    function flowerGardenMoveCursor(e){
      if(!flowerGardenCursor||!flowerGardenDesktopCursor.matches)return;
      flowerGardenCursor.style.left=e.clientX+"px";
      flowerGardenCursor.style.top=e.clientY+"px";
    }
    function flowerGardenSetCursorPressed(pressed){
      if(!flowerGardenCursor||!flowerGardenDesktopCursor.matches)return;
      flowerGardenCursor.classList.toggle("about-swap-cursor--press",pressed);
    }
    function flowerGardenShowCursor(e){
      if(!flowerGardenCursor||!flowerGardenDesktopCursor.matches)return;
      flowerGardenUpdateCursorIcon();
      flowerGardenCursor.classList.add("about-swap-cursor--visible");
      flowerGardenMoveCursor(e);
    }
    function flowerGardenHideCursor(){
      if(!flowerGardenCursor)return;
      flowerGardenSetCursorPressed(false);
      flowerGardenCursor.classList.remove("about-swap-cursor--visible","about-swap-cursor--rotate");
    }
    function flowerGardenToggleMuted(){
      if(!flowerGardenCursor)return;
      flowerGardenMuted=!flowerGardenMuted;
      flowerGardenUpdateCursorIcon();
      flowerGardenCursor.classList.remove("about-swap-cursor--rotate");
      void flowerGardenCursor.offsetWidth;
      flowerGardenCursor.classList.add("about-swap-cursor--rotate");
      setTimeout(function(){
        if(flowerGardenCursor)flowerGardenCursor.classList.remove("about-swap-cursor--rotate");
      },320);
    }
    function flowerGardenAngleDiff(target,current){
      var diff=target-current;
      while(diff>Math.PI)diff-=Math.PI*2;
      while(diff<-Math.PI)diff+=Math.PI*2;
      return diff;
    }
    function flowerGardenPickPointNear(anchorX,anchorY,radius){
      var angle=Math.random()*Math.PI*2,
          distance=Math.random()*radius;
      return {
        x:anchorX+Math.cos(angle)*distance,
        y:anchorY+Math.sin(angle)*distance
      };
    }
    function flowerGardenInitSounds(){
      flowerGardenSoundPool=flowerGardenSounds.map(function(src){
        var a=new Audio(src);
        a.preload="auto";
        return a;
      });
    }
    function flowerGardenPrimeAudio(){
      if(flowerGardenAudioPrimed||!flowerGardenSoundPool.length)return;
      var probe=flowerGardenSoundPool[0];
      flowerGardenAudioPrimed=true;
      probe.muted=true;
      var playPromise=probe.play();
      if(playPromise&&typeof playPromise.then==="function"){
        playPromise.then(function(){
          probe.pause();
          probe.currentTime=0;
          probe.muted=false;
        }).catch(function(){
          probe.muted=false;
          flowerGardenAudioPrimed=false;
        });
      }else{
        probe.pause();
        probe.currentTime=0;
        probe.muted=false;
      }
    }
    function flowerGardenPlaySound(){
      if(flowerGardenMuted||b.classList.contains("is-project-view")||(homeSection&&homeSection.classList.contains("d-none")))return;
      var template=flowerGardenRandomItem(flowerGardenSoundPool),
          a=template?template.cloneNode():new Audio(flowerGardenRandomItem(flowerGardenSounds));
      a.volume=0.35;
      a.play().catch(function(){});
    }
    function flowerGardenStartFireflyLoop(){
      if(flowerGardenFireflyRaf)return;
      flowerGardenFireflyRaf=requestAnimationFrame(flowerGardenStepFireflies);
    }
    function flowerGardenStepFireflies(now){
      flowerGardenFireflyRaf=0;
      for(var i=flowerGardenFireflies.length-1;i>=0;i--){
        var firefly=flowerGardenFireflies[i];
        if(!firefly.plantEl||!firefly.plantEl.parentNode){
          if(firefly.el.parentNode)firefly.el.parentNode.removeChild(firefly.el);
          flowerGardenFireflies.splice(i,1);
          continue;
        }
        if(firefly.framesUntilTarget<=0){
          var nextTarget=flowerGardenPickPointNear(firefly.anchorX,firefly.anchorY,40);
          firefly.targetX=nextTarget.x;
          firefly.targetY=nextTarget.y;
          firefly.framesUntilTarget=60+Math.floor(Math.random()*61);
        }
        firefly.framesUntilTarget--;
        var desiredAngle=Math.atan2(firefly.targetY-firefly.y,firefly.targetX-firefly.x),
            currentAngle=Math.atan2(firefly.vy,firefly.vx),
            jitter=(Math.random()*16-8)*(Math.PI/180),
            steer=flowerGardenClamp(flowerGardenAngleDiff(desiredAngle,currentAngle),-0.06,0.06),
            tetherDistance=Math.hypot(firefly.x-firefly.anchorX,firefly.y-firefly.anchorY);
        currentAngle+=steer+jitter*0.45;
        if(tetherDistance>55){
          var homeAngle=Math.atan2(firefly.anchorY-firefly.y,firefly.anchorX-firefly.x);
          currentAngle+=flowerGardenClamp(flowerGardenAngleDiff(homeAngle,currentAngle),-0.12,0.12);
        }
        firefly.speed=flowerGardenClamp(firefly.speed+(Math.random()*0.04-0.02),0.3,0.8);
        firefly.vx=Math.cos(currentAngle)*firefly.speed;
        firefly.vy=Math.sin(currentAngle)*firefly.speed;
        firefly.x+=firefly.vx;
        firefly.y+=firefly.vy;
        var pulse=0.5+0.5*Math.sin(((now-firefly.bornAt)/firefly.pulseDuration)*Math.PI*2+firefly.pulseOffset),
            glowRadius=firefly.size*1.5+pulse*6,
            glowAlpha=0.45+pulse*0.25;
        firefly.el.style.transform="translate("+(firefly.x-firefly.size/2).toFixed(2)+"px,"+(firefly.y-firefly.size/2).toFixed(2)+"px)";
        firefly.el.style.opacity=(0.35+pulse*0.65).toFixed(3);
        firefly.el.style.boxShadow="0 0 "+glowRadius.toFixed(2)+"px "+flowerGardenHexToRgba(firefly.color,glowAlpha)+", 0 0 "+(glowRadius*2).toFixed(2)+"px "+flowerGardenHexToRgba(firefly.color,glowAlpha*0.65);
      }
      if(flowerGardenFireflies.length)flowerGardenStartFireflyLoop();
    }
    function flowerGardenSpawnFireflies(meta,flowerX,plantEl){
      var anchorX=flowerX-meta.width/2+meta.headOffsetX,
          anchorY=-(meta.height-meta.headOffsetY),
          fireflyCount=2+Math.floor(Math.random()*3);
      for(var i=0;i<fireflyCount;i++){
        var fireflyEl=d.createElement("div"),
            size=1+Math.floor(Math.random()*3),
            color=flowerGardenRandomItem(flowerGardenFireflyColors),
            startPoint=flowerGardenPickPointNear(anchorX,anchorY,18),
            targetPoint=flowerGardenPickPointNear(anchorX,anchorY,40),
            angle=Math.random()*Math.PI*2,
            speed=0.3+Math.random()*0.5;
        fireflyEl.className="flower-garden-firefly";
        fireflyEl.style.width=size+"px";
        fireflyEl.style.height=size+"px";
        fireflyEl.style.background=color;
        fireflyEl.style.transform="translate("+(startPoint.x-size/2).toFixed(2)+"px,"+(startPoint.y-size/2).toFixed(2)+"px)";
        flowerGardenLayer.appendChild(fireflyEl);
        flowerGardenFireflies.push({
          el:fireflyEl,
          plantEl:plantEl,
          anchorX:anchorX,
          anchorY:anchorY,
          x:startPoint.x,
          y:startPoint.y,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed,
          speed:speed,
          size:size,
          color:color,
          targetX:targetPoint.x,
          targetY:targetPoint.y,
          framesUntilTarget:60+Math.floor(Math.random()*61),
          bornAt:performance.now(),
          pulseDuration:1800+Math.random()*1400,
          pulseOffset:Math.random()*Math.PI*2
        });
      }
      flowerGardenStartFireflyLoop();
    }
    function flowerGardenPickSource(isFirstFlower){
      if(!isFirstFlower&&Math.random()<flowerGardenRareSpawnChance)return flowerGardenRareSource;
      return flowerGardenRandomItem(flowerGardenSources);
    }
    function flowerGardenBindFlowerEvents(flowerEl){
      flowerEl.addEventListener("pointerenter",function(e){
        flowerGardenShowCursor(e);
      });
      flowerEl.addEventListener("pointermove",function(e){
        flowerGardenMoveCursor(e);
      });
      flowerEl.addEventListener("pointerleave",function(){
        flowerGardenHideCursor();
      });
      flowerEl.addEventListener("pointerdown",function(e){
        flowerGardenPrimeAudio();
        flowerGardenSetCursorPressed(true);
        flowerGardenMoveCursor(e);
      });
      flowerEl.addEventListener("pointerup",function(){
        flowerGardenSetCursorPressed(false);
      });
      flowerEl.addEventListener("pointercancel",function(){
        flowerGardenSetCursorPressed(false);
      });
      flowerEl.addEventListener("click",function(e){
        flowerGardenPrimeAudio();
        flowerGardenToggleMuted();
        flowerGardenShowCursor(e);
      });
    }
    function flowerGardenStartParticleLoop(){
      if(flowerGardenParticleRaf)return;
      flowerGardenParticleRaf=requestAnimationFrame(flowerGardenStepParticles);
    }
    function flowerGardenStepParticles(){
      flowerGardenParticleRaf=0;
      for(var i=flowerGardenParticles.length-1;i>=0;i--){
        var particle=flowerGardenParticles[i];
        particle.vy+=0.15;
        particle.x+=particle.vx;
        particle.y+=particle.vy;
        particle.life--;
        particle.el.style.transform="translate("+particle.x+"px,"+particle.y+"px)";
        particle.el.style.opacity=Math.max(0,(particle.life/particle.maxLife)*0.8).toFixed(3);
        if(particle.life<=0){
          if(particle.el.parentNode)particle.el.parentNode.removeChild(particle.el);
          flowerGardenParticles.splice(i,1);
        }
      }
      if(flowerGardenParticles.length)flowerGardenStartParticleLoop();
    }
    function flowerGardenBurst(meta,centerX,petalColor){
      var particleCount=2+Math.floor(Math.random()*2),
          originX=centerX,
          originY=-(meta.height-meta.headOffsetY),
          fill=flowerGardenHexToRgba(petalColor,0.8);
      for(var i=0;i<particleCount;i++){
        var particleEl=d.createElement("span"),
            angle=Math.random()*Math.PI*2,
            speed=1.5+Math.random()*1.5,
            size=2+Math.random();
        particleEl.className="flower-garden-particle";
        particleEl.style.width=size+"px";
        particleEl.style.height=size+"px";
        particleEl.style.background=fill;
        particleEl.style.transform="translate("+originX+"px,"+originY+"px)";
        flowerGardenLayer.appendChild(particleEl);
        var life=40+Math.floor(Math.random()*16);
        flowerGardenParticles.push({
          el:particleEl,
          x:originX,
          y:originY,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed,
          life:life,
          maxLife:life
        });
      }
      flowerGardenStartParticleLoop();
    }
    function flowerGardenRestartInterval(){
      if(flowerGardenInterval){
        clearInterval(flowerGardenInterval);
        flowerGardenInterval=null;
      }
      if(flowerGardenCount>=flowerGardenMax)return;
      flowerGardenInterval=setInterval(function(){
        flowerGardenSpawn(false);
      },flowerGardenDelay);
    }
    function flowerGardenMaybeAdjustInterval(){
      if(!flowerGardenTriggered||flowerGardenCount===0||flowerGardenCount%5!==0)return;
      var nextDelay=Math.max(800,3500-Math.floor(flowerGardenCount/5)*200);
      if(nextDelay!==flowerGardenDelay){
        flowerGardenDelay=nextDelay;
        flowerGardenRestartInterval();
      }
    }
    function flowerGardenPickX(meta){
      var bounds=introGardenRoot.getBoundingClientRect(),
          width=Math.max(1,bounds.width),
          minX=meta.width/2,
          maxX=width-meta.width/2,
          fallbackX=width/2,
          tries=0,
          x=fallbackX;
      if(maxX<=minX)return fallbackX;
      while(tries<5){
        x=minX+Math.random()*(maxX-minX);
        if(!flowerGardenPositions.some(function(pos){return Math.abs(pos-x)<22;}))return x;
        tries++;
      }
      return x;
    }
    function flowerGardenGetElementCenterX(el){
      if(!el)return null;
      var anchorEl=el.querySelector(".intro-v2-live-item-name")||el,
          containerRect=introGardenRoot.getBoundingClientRect(),
          elRect=anchorEl.getBoundingClientRect(),
          centerX=elRect.left-containerRect.left+elRect.width/2;
      return centerX;
    }
    function flowerGardenSpawn(options){
      options=options||{};
      if(flowerGardenCount>=flowerGardenMax){
        if(flowerGardenInterval){clearInterval(flowerGardenInterval);flowerGardenInterval=null;}
        return;
      }
      var isFirstFlower=!!options.isFirstFlower,
          meta=flowerGardenPickSource(isFirstFlower),
          isRareFlower=meta.type==="image",
          petalColor=isRareFlower?null:(isFirstFlower?flowerGardenAccentColor():flowerGardenRandomItem(flowerGardenPetalPalette)),
          bodyColor=isRareFlower?null:flowerGardenRandomItem(flowerGardenBodyGreens),
          flowerX=typeof options.x==="number"
            ? flowerGardenClamp(options.x,meta.width/2,Math.max(meta.width/2,introGardenRoot.clientWidth-meta.width/2))
            : flowerGardenClamp(flowerGardenPickX(meta),meta.width/2,Math.max(meta.width/2,introGardenRoot.clientWidth-meta.width/2)),
          flowerEl=d.createElement("div");
      flowerEl.className="flower-garden-flower"+(isRareFlower?" flower-garden-flower--rare":"");
      flowerEl.style.left=flowerX+"px";
      flowerEl.style.width=meta.width+"px";
      flowerEl.style.height=meta.height+"px";
      if(isRareFlower){
        var rarePlantImg=d.createElement("img");
        rarePlantImg.src=meta.src;
        rarePlantImg.alt="";
        rarePlantImg.decoding="async";
        flowerEl.appendChild(rarePlantImg);
      }else{
        flowerEl.innerHTML=flowerGardenRecolorSvg(meta.svg,petalColor,bodyColor);
      }
      flowerGardenBindFlowerEvents(flowerEl);
      flowerGardenLayer.appendChild(flowerEl);
      flowerGardenPositions.push(flowerX);
      flowerGardenCount++;
      void flowerEl.offsetHeight;
      flowerEl.classList.add("is-grown");
      flowerGardenPlaySound();
      if(isRareFlower)flowerGardenSpawnFireflies(meta,flowerX,flowerEl);
      else flowerGardenBurst(meta,flowerX-meta.width/2+meta.headOffsetX,petalColor);
      if(flowerGardenCount>=flowerGardenMax){
        if(flowerGardenInterval){clearInterval(flowerGardenInterval);flowerGardenInterval=null;}
        return;
      }
      flowerGardenMaybeAdjustInterval();
    }
    function flowerGardenHandleMouseEnter(e){
      flowerGardenTrigger(e.currentTarget);
    }
    function flowerGardenTrigger(targetEl){
      if(flowerGardenTriggered)return;
      flowerGardenPrimeAudio();
      flowerGardenTriggered=true;
      liveItems.forEach(function(el){
        el.removeEventListener("pointerenter",flowerGardenHandleMouseEnter);
      });
      flowerGardenSpawn({
        isFirstFlower:true,
        x:flowerGardenGetElementCenterX(targetEl)
      });
      flowerGardenRestartInterval();
    }
    if(flowerGardenIsTouchDevice){
      flowerGardenTriggered=true;
      setTimeout(function(){
        flowerGardenSpawn({isFirstFlower:true});
        flowerGardenRestartInterval();
      },1200);
    }else{
      liveItems.forEach(function(el){
        el.addEventListener("pointerenter",flowerGardenHandleMouseEnter);
      });
    }
    flowerGardenInitSounds();
    flowerGardenUpdateCursorIcon();
    introGardenRoot.addEventListener("pointerdown",flowerGardenPrimeAudio,{once:true,passive:true});
    introGardenRoot.addEventListener("touchstart",flowerGardenPrimeAudio,{once:true,passive:true});
    introGardenRoot.addEventListener("click",flowerGardenPrimeAudio,{once:true,passive:true});
    introGardenRoot.addEventListener("mouseleave",flowerGardenHideCursor);
  }

  /* Email copy-to-clipboard with toast (follows cursor until it disappears) */
  var toast=d.getElementById("emailToast"),toastTimer=null,toastFollowHandler=null;
  function positionToastAt(clientX,clientY){
    var x=Math.max(60,Math.min(w.innerWidth-60,clientX)),y=clientY;
    var bottomPx=w.innerHeight-y+20;
    if(bottomPx<24)bottomPx=24;else if(bottomPx>w.innerHeight-24)bottomPx=w.innerHeight-24;
    toast.style.left=x+"px";toast.style.bottom=bottomPx+"px";toast.style.right="auto";toast.style.top="auto";
  }
  function showToastAt(ev){
    if(toastTimer){clearTimeout(toastTimer);toast.classList.remove("email-toast--visible")}
    if(toastFollowHandler){w.removeEventListener("mousemove",toastFollowHandler);toastFollowHandler=null}
    positionToastAt(ev.clientX,ev.clientY);
    void toast.offsetWidth;toast.classList.add("email-toast--visible");
    toastFollowHandler=function(e){positionToastAt(e.clientX,e.clientY)};
    w.addEventListener("mousemove",toastFollowHandler,{passive:true});
    toastTimer=setTimeout(function(){toast.classList.remove("email-toast--visible");toastTimer=null;if(toastFollowHandler){w.removeEventListener("mousemove",toastFollowHandler);toastFollowHandler=null}},2400);
  }
  function copyEmail(e){e.preventDefault();var email=this.dataset.email;if(!email)return;navigator.clipboard.writeText(email).then(function(){showToastAt(e)}).catch(function(){var t=d.createElement("textarea");t.value=email;t.style.position="fixed";t.style.opacity="0";b.appendChild(t);t.select();d.execCommand("copy");b.removeChild(t);showToastAt(e)})}
  d.querySelectorAll("[data-email]").forEach(function(el){el.addEventListener("click",copyEmail)});
});
})();

/* ── Pitchbook Carousel ── */
(function(){
  var carousel=document.getElementById("pbCarousel");
  if(!carousel)return;
  var slides=Array.from(carousel.querySelectorAll(".pb-slide"));
  var dots=Array.from(carousel.querySelectorAll(".pb-dot"));
  var thumbPrevImg=carousel.querySelector(".pb-thumb--prev .pb-thumb-img");
  var thumbNextImg=carousel.querySelector(".pb-thumb--next .pb-thumb-img");
  var counter=carousel.querySelector(".pb-counter");
  var total=slides.length;
  var current=0;

  function goTo(idx){
    slides[current].classList.remove("pb-active");
    dots[current].classList.remove("pb-active");
    dots[current].setAttribute("aria-selected","false");
    current=(idx+total)%total;
    slides[current].classList.add("pb-active");
    dots[current].classList.add("pb-active");
    dots[current].setAttribute("aria-selected","true");
    var n=current+1;
    counter.textContent=(n<10?"0"+n:""+n)+" / "+(total<10?"0"+total:""+total);
    var prevIdx=(current-1+total)%total;
    var nextIdx=(current+1)%total;
    thumbPrevImg.src=slides[prevIdx].querySelector("img").src;
    thumbNextImg.src=slides[nextIdx].querySelector("img").src;
  }

  carousel.querySelector(".pb-arrow--prev").addEventListener("click",function(){goTo(current-1)});
  carousel.querySelector(".pb-arrow--next").addEventListener("click",function(){goTo(current+1)});

  var thumbPrevEl=carousel.querySelector(".pb-thumb--prev");
  var thumbNextEl=carousel.querySelector(".pb-thumb--next");
  if(thumbPrevEl)thumbPrevEl.addEventListener("click",function(){goTo(current-1)});
  if(thumbNextEl)thumbNextEl.addEventListener("click",function(){goTo(current+1)});

  dots.forEach(function(dot,i){dot.addEventListener("click",function(){goTo(i)})});

  var touchStartX=0;
  carousel.addEventListener("touchstart",function(e){touchStartX=e.touches[0].clientX},{passive:true});
  carousel.addEventListener("touchend",function(e){
    var delta=e.changedTouches[0].clientX-touchStartX;
    if(Math.abs(delta)>40)goTo(current+(delta<0?1:-1));
  });

  carousel.setAttribute("tabindex","0");
  carousel.addEventListener("keydown",function(e){
    if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();goTo(current+1);}
    else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();goTo(current-1);}
  });

  goTo(0);
})();

/* ── Bountt: count-up on scroll ── */
(function(){
  function animateCountUp(el){
    var target=parseInt(el.dataset.target,10);
    var duration=1400;
    var start=performance.now();
    function tick(now){
      var elapsed=Math.min(now-start,duration);
      var progress=elapsed/duration;
      var eased=1-Math.pow(1-progress,3);
      el.textContent=Math.round(eased*target);
      if(elapsed<duration){requestAnimationFrame(tick);}
      else{el.textContent=target;}
    }
    requestAnimationFrame(tick);
  }
  var countObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting&&!entry.target.dataset.counted){
        entry.target.dataset.counted="1";
        animateCountUp(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  },{threshold:0.3});
  document.querySelectorAll("[data-count-up]").forEach(function(el){countObserver.observe(el);});
})();
