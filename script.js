const row=document.getElementById('imageRow')
const prev=document.getElementById('prevBtn')
const next=document.getElementById('nextBtn')
const title=document.querySelector('.project-title')
const desc=document.querySelector('.project-desc')

function update(){
  row.querySelectorAll('.carousel-img').forEach(img=>img.classList.remove('active'))
  const center=row.children[1]
  center.classList.add('active')
  title.textContent=center.dataset.title
  title.style.color=center.dataset.color
  desc.textContent=center.dataset.desc
}

prev.onclick=()=>{
  row.insertBefore(row.lastElementChild,row.firstElementChild)
  update()
}

next.onclick=()=>{
  row.appendChild(row.firstElementChild)
  update()
}

update()
