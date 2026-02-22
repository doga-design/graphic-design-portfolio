/* Portfolio App — consolidated, deferred, optimized */
(function(){
"use strict";
var d=document,b=d.body,w=window;

/* ── Throttle helper ── */
function throttle(fn,ms){var t=0;return function(){var n=Date.now();if(n-t>=ms){t=n;fn()}}}

/* ── Scroll progress + page marker ── */
var progressLine=d.getElementById("csProgressLine"),
    pageMarker=d.getElementById("csPageMarker"),
    prefersReduced=w.matchMedia("(prefers-reduced-motion:reduce)").matches;

function updateScroll(){
  if(!b.classList.contains("is-project-view"))return;
  if(progressLine){var h=d.documentElement.scrollHeight-w.innerHeight;progressLine.style.width=(h>0?(w.scrollY/h)*100:0)+"%"}
  if(pageMarker){if(w.scrollY<300)pageMarker.classList.remove("visible");else pageMarker.classList.add("visible")}
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

/* ── Lightbox ── */
var lightbox=d.getElementById("lightbox"),
    lbImg=lightbox.querySelector(".lightbox-img"),
    lbClose=lightbox.querySelector(".lightbox-close"),
    lbPrev=lightbox.querySelector(".lightbox-prev"),
    lbNext=lightbox.querySelector(".lightbox-next"),
    curImgs=[],curIdx=0;

function lbShow(idx){if(curImgs[idx]){lbImg.src=curImgs[idx].src;lbImg.alt=curImgs[idx].alt;curIdx=idx;lbPrev.style.display=curIdx>0?"block":"none";lbNext.style.display=curIdx<curImgs.length-1?"block":"none"}}

function lbOpen(img){
  var sec=img.closest(".project-page");
  curImgs=sec?Array.from(sec.querySelectorAll(".project-hero-frame img:not(.hero-gif-link img),.gallery-thumb")):[ img];
  curIdx=curImgs.indexOf(img);
  lbShow(curIdx);lightbox.classList.add("active");b.style.overflow="hidden";
}
function lbCloseFn(){lightbox.classList.remove("active");b.style.overflow=""}

lbClose.addEventListener("click",lbCloseFn);
lightbox.addEventListener("click",function(e){if(e.target===lightbox)lbCloseFn()});
lbPrev.addEventListener("click",function(e){e.stopPropagation();if(curIdx>0)lbShow(curIdx-1)});
lbNext.addEventListener("click",function(e){e.stopPropagation();if(curIdx<curImgs.length-1)lbShow(curIdx+1)});
d.addEventListener("keydown",function(e){
  if(!lightbox.classList.contains("active"))return;
  if(e.key==="Escape")lbCloseFn();
  else if(e.key==="ArrowLeft"&&curIdx>0)lbShow(curIdx-1);
  else if(e.key==="ArrowRight"&&curIdx<curImgs.length-1)lbShow(curIdx+1);
});

/* ── DOM Ready ── */
d.addEventListener("DOMContentLoaded",function(){
  var homeSection=d.getElementById("home"),
      projectSections=d.querySelectorAll(".project-page"),
      projectLinks=d.querySelectorAll(".project-link"),
      homeLinks=d.querySelectorAll("[data-go-home]");

  /* Setup lightbox click handlers */
  var lbTargets=d.querySelectorAll(".project-hero-frame img:not(.hero-gif-link img),.gallery-thumb");
  for(var i=0;i<lbTargets.length;i++){
    if(lbTargets[i].closest(".hero-gif-link"))continue;
    lbTargets[i].style.cursor="pointer";
    lbTargets[i].addEventListener("click",function(){lbOpen(this)});
  }

  /* ── Filter logic ── */
  var filterLinks=d.querySelectorAll(".filter-link"),
      cards=d.querySelectorAll(".work-card");
  filterLinks.forEach(function(link){
    link.addEventListener("click",function(e){
      e.preventDefault();
      filterLinks.forEach(function(l){l.classList.remove("active")});
      link.classList.add("active");
      var f=link.dataset.filter;
      cards.forEach(function(c){c.classList.toggle("d-none",f!=="all"&&c.dataset.category!==f)});
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
  }
  function showProject(id){
    homeSection.classList.add("d-none");
    projectSections.forEach(function(s){s.classList.toggle("d-none",s.id!==id)});
    b.classList.add("is-project-view");
    w.scrollTo({top:0,behavior:"smooth"});
    /* Reset progress + marker */
    if(progressLine)progressLine.style.width="0%";
    var sec=d.getElementById(id);
    if(sec&&pageMarker){pageMarker.textContent=sec.dataset.projectName||"";pageMarker.classList.remove("visible")}
    /* Re-trigger cover animation */
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
  var aboutFront=d.getElementById("aboutCardFront"),aboutBack=d.getElementById("aboutCardBack"),aboutBtn=d.getElementById("aboutSwapBtn");
  if(aboutFront&&aboutBack&&aboutBtn){
    function aboutSwap(){
      aboutFront.classList.toggle("about-card--swapped");
      aboutBack.classList.toggle("about-card--swapped");
      aboutBtn.classList.toggle("about-card-swap--rotated");
    }
    aboutBtn.addEventListener("click",aboutSwap);
    aboutFront.addEventListener("click",aboutSwap);
    aboutBack.addEventListener("click",aboutSwap);
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
