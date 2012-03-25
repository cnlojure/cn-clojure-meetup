var present = (function () {
  var document = window.document, // TODO this could be changed to a div
      slides = [],
      deckTitle = document.title,
      currentSlide = null,
      revealList = [],
      flat = false,
      flatStateBeforePrint = flat,
      usekeypress = /opera/i.test(navigator.userAgent), // lame - but still works if false positive
      width = 800,
      height = 600,
      loaded = false;

  function addStyle(css) {
    var style = document.createElement('style'),
        head = document.getElementsByTagName('head')[0];

    style[style.innerText === undefined ? 'textContent' : 'innerText'] = css;
    head.appendChild(style);
  }
  
  function resizeTo(w, h) {
    width = w;
    height = h;
    
    if (loaded == true) {
      var el = slides[0],
          comp = el.currentStyle ? el.currentStyle : getComputedStyle(el, null);
      
      adjustedWidth = width - (parseInt(comp['padding-left']) + parseInt(comp['padding-right']));
      adjustedHeight = height - (parseInt(comp['padding-top']) + parseInt(comp['padding-bottom']));

      var gap = 50,
          prevMargin = (width + width/2 + gap),
          prev1Margin = prevMargin + gap + width,
          nextMargin = width/2 + gap,
          next1Margin = nextMargin + gap + (width/2);

      addStyle('.slide { width: ' + adjustedWidth + 'px; height: ' + adjustedHeight + 'px; margin-top: -' + (height / 2) + 'px; margin-left: -' + (width / 2) + 'px; } .slide.next { margin-left: ' + nextMargin + 'px; } .slide.next1 { margin-left: ' + next1Margin + 'px; } .slide.prev { margin-left: -' + prevMargin + 'px;} .slide.prev1 { margin-left: -' + prev1Margin + 'px;}'); // margin-left: -' + (height / 2) + 'px;
    } // else it'll use the values passed
  }

  function removeClass(el, className) {
    var re = new RegExp('\\s*?' + className + '\\s*?', 'g');
    if (el.nodeName) {
      el.className = el.className.replace(re, '');
    } else {
      el.forEach(function (el) {
        el.className = el.className.replace(re, '');
      });
    }
  }

  function loadSlide(slide, fromhashchange) {
    var index = slides.indexOf(slide);
    
    currentSlide = slide;
    revealList = [].slice.call(currentSlide.querySelectorAll('.reveal'), 0);
    
    removeClass(revealList, 'current');
    removeClass(slides, '(prev(1|)|next(1|))');
    if (index > 0) {
      slides[index-1].className += ' prev';
      if (index > 1) {
        slides[index-2].className += ' prev1';
      }
    }
    
    if (index < slides.length - 1) {
      slides[index+1].className += ' next';
      if (index < slides.length - 2) {
        slides[index+2].className += ' next1';
      }
    }
    
    slide.className += ' current';
    document.title = slide.getAttribute('data-title') + ' :: ' + deckTitle;
    
    if (!fromhashchange) {
      if (history.pushState) {
        history.pushState('', document.title, '#' + slide.id);        
      } else {
        window.location.hash = '#' + slide.id;
      }
    }
  }

  function move(dir) {
    var index = slides.indexOf(currentSlide),
        toReveal = revealList.filter(function (el) {
          return (
            (dir > 0 && el.className.indexOf('show') === -1) ||
            (dir < 0 && el.className.indexOf('show') !== -1)
          );
        });

    // first check if current has any reveal classes
    if (toReveal.length) {
      removeClass(revealList, 'current');
      if (dir > 0) {
        toReveal[0].className += ' show current';
      } else if (dir < 0) { // less likely to happen
        removeClass(revealList, 'show');
      }
    } else {
      if ((dir > 0 && index != slides.length-1) || (dir < 0 && index != 0)) {
        removeClass(currentSlide, 'current');
        removeClass(revealList, 'show');
        loadSlide(slides[index+dir]);
      }    
    }
  }

  function next() {
    move(+1);
  }

  function prev() {
    move(-1);
  }
  
  function updateReability() {
    if (flat) {
      document.documentElement.className += ' flat';
    } else {
      window.scroll(0,0);
      removeClass(document.documentElement, 'flat');
    }
    
    try {
      localStorage.setItem('flat', flat ? 1 : 0);
    } catch (e) {}
  }

  function init() {
    // read from the url or default to the first
    var id = window.location.hash.substr(1),
        slideIds = {};

    slides = [].slice.call(document.querySelectorAll('.slide'), 0);

    // set up the ids and select the right slide
    slides.forEach(function (slide, i) {
      if (!slide.id) slide.id = 'slide' + (i+1);
      slideIds[slide.id] = slide; // use in hashchange event
      
      var title = slide.querySelectorAll('header,h1,h2,h3,h4,h5,h6');
      if (title.length) {
        title = title[0].textContent || title[0].innerText;
      } else {
        title = 'Slide #' + (i+1);
      }
      
      slide.setAttribute('data-title', title);
      
      [].forEach.call(slide.querySelectorAll('ol.reveal > li, ul.reveal > li'), function (el, i) {
        if (i == 0) {
          removeClass(el.parentNode, 'reveal');
        }
        el.className += ' reveal';
      });
    });
    
    // try to load the right slide
    loadSlide(slideIds[id] || slideIds[slides[0].id] || slideIds['slide1']);
    
    if (document.nodeName != '#document') { // then we've hooked in to a div, let's just make it focusable
      document.tabIndex = 0;
    }

    // hook up the keyboard control
    document[usekeypress ? 'onkeypress' : 'onkeydown'] = function (event) {
      var which = event.keyCode;

      if (which == 84) { // key = esc
        flat = !flat;
        updateReability();
      }

      if (!flat) {
        if (which == 37 || which == 38 || (which == 32 && event.shiftKey == true)) {
          prev();
          event.preventDefault();
        } else if (which == 39 || which == 40 || which == 32) {
          next();
          event.preventDefault();
        }        
      }
    };
    
    var mouserollTimer = null;
    window.onmousewheel = function (event) {
      if (!flat) {
        var rolled = 0;
        if (event.wheelDelta === undefined) {   // Firefox
          // The measurement units of the detail and wheelDelta properties are different.
          rolled = -40 * event.detail;
        }
        else {
          rolled = event.wheelDelta;
        }

        clearTimeout(mouserollTimer);
        if (rolled > 0) {
          mouserollTimer = setTimeout(prev, 10);
        } else {
          mouserollTimer = setTimeout(next, 10);
        }

        return false;        
      }
    };
    
    window.onbeforeprint = function () {
      flatStateBeforePrint = flat;
      updateReability();
    };
    
    window.onafterprint = function () {
      flat = flatStateBeforePrint;
      updateReability();
    };
    
    // listen for hash changes
    window.onhashchange = function () {
      var id = window.location.hash.substr(1);
      // ignore other url hash changes
      if (slideIds[id]) {
        removeClass(currentSlide, 'current');
        loadSlide(slideIds[id], true);
      }
    };
    
    // FIXME the following assumes we're working with a document element
    document.body.ontouchstart = function (event) {
      var x = event.touches[0].pageX;
      if (x > window.innerWidth/2) {
        next();
      } else {
        prev();
      }
    };
    
    document.body.ontouchmove = function () {
      return false;
    };
    
    var meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'width=device-width; height=device-height; user-scalable=no; initial-scale=0.45');
    document.querySelector('head').appendChild(meta);
    document.documentElement.className += ' flat';
    
    // append the flatnotice element
    var flatnotice = document.createElement('div');
    flatnotice.innerHTML = 'press "T" to toggle inline display';
    flatnotice.id = 'flatnotice';
    document.body.appendChild(flatnotice);
    
    setTimeout(function () {
      flatnotice.className = 'hide';
    }, 2000);

    loaded = true; // must come before resizeTo
    resizeTo(width, height);
    
    try {
      flat = localStorage.getItem('flat') == 1; // using type coercion
      updateReability();
    } catch (e) {}
  }

  return {
    init: init,
    resizeTo: resizeTo
  };
})();

window.addEventListener('DOMContentLoaded', present.init, false);

