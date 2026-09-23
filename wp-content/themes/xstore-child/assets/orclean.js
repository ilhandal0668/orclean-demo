/**
 * Orclean - mobil menü açma/kapama
 *
 * Erişilebilirlik: aria-expanded güncellenir, Escape ile kapanır,
 * odak düğmeye geri döner.
 */
( function () {
	'use strict';

	var dugme = document.querySelector( '.oc-nav__toggle' );
	var menu  = document.getElementById( 'oc-menu' );

	if ( ! dugme || ! menu ) {
		return;
	}

	function ayarla( acik ) {
		menu.classList.toggle( 'is-open', acik );
		dugme.setAttribute( 'aria-expanded', acik ? 'true' : 'false' );
		dugme.querySelector( '.oc-visually-hidden' ).textContent = acik ? 'Menüyü kapat' : 'Menüyü aç';
	}

	dugme.addEventListener( 'click', function () {
		ayarla( 'true' !== dugme.getAttribute( 'aria-expanded' ) );
	} );

	document.addEventListener( 'keydown', function ( olay ) {
		if ( 'Escape' === olay.key && menu.classList.contains( 'is-open' ) ) {
			ayarla( false );
			dugme.focus();
		}
	} );
}() );

/**
 * Ana sayfa ürün slider'ı: dokunma/kaydırma, oklar, noktalar ve sakin otomatik geçiş.
 */
( function () {
	'use strict';

	var slider = document.querySelector( '[data-product-slider]' );
	if ( ! slider ) {
		return;
	}

	var track = slider.querySelector( '.oc-product-slider__track' );
	var cards = Array.prototype.slice.call( track.children );
	var prev = document.querySelector( '[data-slider-prev]' );
	var next = document.querySelector( '[data-slider-next]' );
	var dots = slider.querySelector( '[data-slider-dots]' );
	var timer;
	var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	function visibleCount() {
		if ( window.innerWidth <= 600 ) {
			return 1;
		}
		if ( window.innerWidth <= 991 ) {
			return 2;
		}
		if ( window.innerWidth <= 1279 ) {
			return 3;
		}
		// Geniş ekranda dörtlü: 12 makine tam üç slayt eder.
		return 4;
	}

	function stepSize() {
		if ( ! cards.length ) {
			return track.clientWidth;
		}
		return cards[0].getBoundingClientRect().width + 20;
	}

	function pages() {
		return Math.max( 1, Math.ceil( cards.length / visibleCount() ) );
	}

	function currentPage() {
		return Math.min( pages() - 1, Math.round( track.scrollLeft / ( stepSize() * visibleCount() ) ) );
	}

	function updateDots() {
		Array.prototype.forEach.call( dots.children, function ( dot, index ) {
			dot.classList.toggle( 'is-active', index === currentPage() );
		} );
	}

	function renderDots() {
		dots.innerHTML = '';
		for ( var index = 0; index < pages(); index++ ) {
			var dot = document.createElement( 'button' );
			dot.type = 'button';
			dot.setAttribute( 'tabindex', '-1' );
			dot.addEventListener( 'click', ( function ( page ) {
				return function () {
					track.scrollTo( { left: page * stepSize() * visibleCount(), behavior: 'smooth' } );
				};
			}( index ) ) );
			dots.appendChild( dot );
		}
		updateDots();
	}

	function go( direction ) {
		var target = currentPage() + direction;
		if ( target >= pages() ) {
			target = 0;
		}
		if ( target < 0 ) {
			target = pages() - 1;
		}
		track.scrollTo( { left: target * stepSize() * visibleCount(), behavior: 'smooth' } );
	}

	function start() {
		if ( reduceMotion || pages() < 2 ) {
			return;
		}
		window.clearInterval( timer );
		timer = window.setInterval( function () { go( 1 ); }, 5500 );
	}

	prev.addEventListener( 'click', function () { go( -1 ); start(); } );
	next.addEventListener( 'click', function () { go( 1 ); start(); } );
	track.addEventListener( 'scroll', function () { window.requestAnimationFrame( updateDots ); }, { passive: true } );
	slider.addEventListener( 'mouseenter', function () { window.clearInterval( timer ); } );
	slider.addEventListener( 'mouseleave', start );
	slider.addEventListener( 'focusin', function () { window.clearInterval( timer ); } );
	slider.addEventListener( 'focusout', start );
	window.addEventListener( 'resize', renderDots );

	renderDots();
	start();
}() );

/** 30+ yıl sayacını yalnızca görünür olduğunda çalıştırır. */
( function () {
	'use strict';
	var counter = document.querySelector( '[data-counter]' );
	if ( ! counter ) {
		return;
	}
	var target = parseInt( counter.getAttribute( 'data-counter' ), 10 ) || 30;
	var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var started = false;

	function animate() {
		if ( started ) { return; }
		started = true;
		if ( reduceMotion ) { counter.textContent = target; return; }
		var startTime;
		function frame( time ) {
			startTime = startTime || time;
			var progress = Math.min( ( time - startTime ) / 1300, 1 );
			counter.textContent = Math.round( target * ( 1 - Math.pow( 1 - progress, 3 ) ) );
			if ( progress < 1 ) { window.requestAnimationFrame( frame ); }
		}
		window.requestAnimationFrame( frame );
	}

	if ( 'IntersectionObserver' in window ) {
		new IntersectionObserver( function ( entries, observer ) {
			if ( entries[0].isIntersecting ) { animate(); observer.disconnect(); }
		}, { threshold: .45 } ).observe( counter );
	} else {
		animate();
	}
}() );

/**
 * Kahraman slider'ı: öne çıkan makineler arasında çapraz solma ile geçiş.
 * Oklar, noktalar, parmakla kaydırma ve otomatik geçiş.
 * Fare üzerindeyken, odaklanıldığında ve sekme arka plandayken durur.
 */
( function () {
	'use strict';

	var slider = document.querySelector( '[data-hero-slider]' );
	if ( ! slider ) {
		return;
	}

	var slaytlar = Array.prototype.slice.call( slider.querySelectorAll( '.oc-hero-slider__slayt' ) );
	if ( slaytlar.length < 2 ) {
		return;
	}

	var noktalar = Array.prototype.slice.call( slider.querySelectorAll( '[data-hero-dot]' ) );
	var geri     = slider.querySelector( '[data-hero-prev]' );
	var ileri    = slider.querySelector( '[data-hero-next]' );
	var SURE     = 6000;
	var aktif    = 0;
	var sayac;
	var azHareket = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	slider.style.setProperty( '--oc-slider-sure', SURE + 'ms' );

	function goster( hedef ) {
		aktif = ( hedef + slaytlar.length ) % slaytlar.length;

		slaytlar.forEach( function ( slayt, i ) {
			var acik = i === aktif;
			slayt.classList.toggle( 'is-active', acik );
			if ( acik ) {
				slayt.removeAttribute( 'aria-hidden' );
			} else {
				slayt.setAttribute( 'aria-hidden', 'true' );
			}
		} );

		noktalar.forEach( function ( nokta, i ) {
			var acik = i === aktif;
			// Dolum animasyonunu yeniden başlatmak için sınıfı sıfırla.
			nokta.classList.remove( 'is-active' );
			if ( acik ) {
				void nokta.offsetWidth;
				nokta.classList.add( 'is-active' );
			}
			nokta.setAttribute( 'aria-selected', acik ? 'true' : 'false' );
		} );
	}

	function basla() {
		if ( azHareket ) {
			return;
		}
		durdur();
		sayac = window.setInterval( function () { goster( aktif + 1 ); }, SURE );
	}

	function durdur() {
		window.clearInterval( sayac );
	}

	if ( geri ) {
		geri.addEventListener( 'click', function () { goster( aktif - 1 ); basla(); } );
	}
	if ( ileri ) {
		ileri.addEventListener( 'click', function () { goster( aktif + 1 ); basla(); } );
	}

	noktalar.forEach( function ( nokta, i ) {
		nokta.addEventListener( 'click', function () { goster( i ); basla(); } );
	} );

	// Klavye: sol/sağ ok tuşları.
	slider.addEventListener( 'keydown', function ( olay ) {
		if ( 'ArrowLeft' === olay.key ) {
			olay.preventDefault();
			goster( aktif - 1 );
			basla();
		} else if ( 'ArrowRight' === olay.key ) {
			olay.preventDefault();
			goster( aktif + 1 );
			basla();
		}
	} );

	// Parmakla kaydırma.
	var baslangicX = null;
	slider.addEventListener( 'touchstart', function ( olay ) {
		baslangicX = olay.changedTouches[0].clientX;
		durdur();
	}, { passive: true } );

	slider.addEventListener( 'touchend', function ( olay ) {
		if ( null === baslangicX ) {
			return;
		}
		var fark = olay.changedTouches[0].clientX - baslangicX;
		if ( Math.abs( fark ) > 45 ) {
			goster( fark < 0 ? aktif + 1 : aktif - 1 );
		}
		baslangicX = null;
		basla();
	}, { passive: true } );

	slider.addEventListener( 'mouseenter', durdur );
	slider.addEventListener( 'mouseleave', basla );
	slider.addEventListener( 'focusin', durdur );
	slider.addEventListener( 'focusout', basla );

	document.addEventListener( 'visibilitychange', function () {
		if ( document.hidden ) {
			durdur();
		} else {
			basla();
		}
	} );

	goster( 0 );
	basla();
}() );

/**
 * Yukarı çık düğmesi.
 * Sayfa bir ekran boyu kaydırıldığında belirir; kenarındaki halka
 * sayfanın ne kadarının okunduğunu gösterir.
 */
( function () {
	'use strict';

	var dugme = document.querySelector( '[data-yukari]' );
	if ( ! dugme ) {
		return;
	}

	var halka = dugme.querySelector( '.oc-yukari__ilerleme' );
	var azHareket = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var bekliyor = false;

	dugme.hidden = false;

	function guncelle() {
		var kaydirma = window.scrollY || document.documentElement.scrollTop;
		var toplam = document.documentElement.scrollHeight - window.innerHeight;
		var esik = window.innerHeight * 0.75;

		dugme.classList.toggle( 'is-gorunur', kaydirma > esik );

		if ( halka && toplam > 0 ) {
			var oran = Math.min( 1, Math.max( 0, kaydirma / toplam ) );
			halka.setAttribute( 'stroke-dashoffset', String( 100 - oran * 100 ) );
		}

		bekliyor = false;
	}

	window.addEventListener( 'scroll', function () {
		if ( ! bekliyor ) {
			bekliyor = true;
			window.requestAnimationFrame( guncelle );
		}
	}, { passive: true } );

	window.addEventListener( 'resize', guncelle, { passive: true } );

	dugme.addEventListener( 'click', function () {
		window.scrollTo( {
			top: 0,
			behavior: azHareket ? 'auto' : 'smooth'
		} );
	} );

	guncelle();
}() );

/**
 * Yapışkan üstbilgi.
 *
 * İki iş yapar:
 *  1. Üst şeridin yüksekliğini ölçüp `--oc-ust-serit` değişkenine yazar.
 *     CSS bunu negatif `top` olarak kullanır; böylece sayfa kaydıkça üst
 *     şerit yukarı kayıp kaybolur, gezinme satırı tepeye oturur.
 *  2. Kaydırıldığında yalnızca gölge için `is-yapiskan` sınıfını ekler.
 *
 * Ölçüm SADECE yükleme ve yeniden boyutlandırmada yapılır; kaydırma
 * sırasında hiçbir yükseklik değişmez. Aksi halde belge boyu değişir,
 * tarayıcının kaydırma çıpası scrollY'yi düzeltir ve üstbilgi açılıp
 * kapanarak titrer.
 */
( function () {
	'use strict';

	var ustbilgi = document.querySelector( '.oc-header' );
	if ( ! ustbilgi ) {
		return;
	}

	var serit = ustbilgi.querySelector( '.oc-topbar' );
	var bekliyor = false;
	var olcumZamani;

	function seridiOlc() {
		var y = serit ? serit.offsetHeight : 0;
		ustbilgi.style.setProperty( '--oc-ust-serit', y + 'px' );
	}

	function golgeyiGuncelle() {
		var kaydirma = window.scrollY || document.documentElement.scrollTop;
		ustbilgi.classList.toggle( 'is-yapiskan', kaydirma > 8 );
		bekliyor = false;
	}

	window.addEventListener( 'scroll', function () {
		if ( ! bekliyor ) {
			bekliyor = true;
			window.requestAnimationFrame( golgeyiGuncelle );
		}
	}, { passive: true } );

	window.addEventListener( 'resize', function () {
		window.clearTimeout( olcumZamani );
		olcumZamani = window.setTimeout( seridiOlc, 150 );
	}, { passive: true } );

	seridiOlc();
	golgeyiGuncelle();

	// Yazı tipleri sonradan yüklenirse şerit yüksekliği değişebilir.
	if ( document.fonts && document.fonts.ready ) {
		document.fonts.ready.then( seridiOlc );
	}
}() );
