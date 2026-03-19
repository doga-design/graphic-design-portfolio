/* Portfolio App — consolidated, deferred, optimized */
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
        workRevealText.textContent="View all 6 projects";
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
