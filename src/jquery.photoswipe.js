import PhotoSwipe from 'PhotoSwipe';
import PhotoSwipeUI_Default from 'PhotoSwipeUI_Default';


function _factory($) {
    var $defaultGallery = $('<div class="pswp" tabindex="-1" role="dialog" aria-hidden="true"><div class="pswp__bg"></div><div class="pswp__scroll-wrap"><div class="pswp__container"><div class="pswp__item"></div><div class="pswp__item"></div><div class="pswp__item"></div></div><div class="pswp__ui pswp__ui--hidden"><div class="pswp__top-bar"><div class="pswp__counter"></div><button class="pswp__button pswp__button--close" title="Close (Esc)"></button> <button class="pswp__button pswp__button--share" title="Share"></button> <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button> <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button><div class="pswp__preloader"><div class="pswp__preloader__icn"><div class="pswp__preloader__cut"><div class="pswp__preloader__donut"></div></div></div></div></div><div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap"><div class="pswp__share-tooltip"></div></div><button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"></button> <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"></button><div class="pswp__caption"><div class="pswp__caption__center"></div></div></div></div></div>')
        .appendTo('body'),
        uid             = 1;

    function getThumbBoundsFn($imgs) {
        return function _getThumbBoundsFn(index) {
            var $img      = $imgs.filter(function () {
                    return $(this).data('index') == index;
                }).eq(0),
                imgOffset = $img.offset(),
                imgWidth  = $img[0].width;

            return {x: imgOffset.left, y: imgOffset.top, w: imgWidth};
        };
    }

    function getWH(wh, $img) {
        var d        = $.Deferred(),
            wh_value = $img.data(`original-src-${wh}`);

        if (wh_value) {
            d.resolve(wh_value);
        } else {
            $(`<img>`).on('load', function () {
                d.resolve(this[wh]);
            }).attr('src', $img.attr('src'));
        }

        return d.promise();
    }

    function getHeight($img) {
        return getWH('height', $img);
    }

    function getWidth($img) {
        return getWH('width', $img);
    }

    function getImgSize($img) {
        return $.when(getWidth($img), getHeight($img));
    }

    function getImgInfo() {
        var $img         = $(this),
            original_src = $img.data('original-src') || $img.attr('src'),
            d            = $.Deferred();

        getImgSize($img).done(function (w, h) {
            d.resolve({
                w: w,
                h: h,
                src: original_src,
                msrc: $img.attr('src'),
                title: $img.attr('alt')
            });
        });

        return d.promise();
    }

    function getImgInfoArray($imgs) {
        var imgInfoArray = $imgs.map(getImgInfo).get(),
            d            = $.Deferred();

        $.when.apply($, imgInfoArray).done(function () {
            var imgInfoArray = Array.prototype.slice.call(arguments);
            d.resolve(imgInfoArray);
        });

        return d.promise();
    }

    function getOptions($gallery) {
        return $gallery.data('photoswipeOptions');
    }

    function addIndex($imgs) {
        $imgs.each(function (index) {
            var $this  = $(this),
                _index = $this.data('index');
            if (!_index) {
                $this.data('index', index);
            }
        });
    }

    function addUID($gallery) {
        if (!$gallery.data('pswp-uid')) {
            $gallery.data('pswp-uid', uid++);
        }
    }

    function openPhotoSwipe(index, $gallery, $imgs, imgInfoArray) {
        var options    = $.extend(getOptions($gallery).globalOptions, {index: index, getThumbBoundsFn: getThumbBoundsFn($imgs), galleryUID: $gallery.data('pswp-uid')}),
            photoSwipe = new PhotoSwipe($defaultGallery[0], PhotoSwipeUI_Default, imgInfoArray, options);

        $.each(getOptions($gallery).events, function (eventName, eventHandler) {
            photoSwipe.listen(eventName, eventHandler);
        });

        photoSwipe.init();
    }

    // parse picture index and gallery index from URL (#&pid=1&gid=2)
    function photoswipeParseHash() {
        var hash   = window.location.hash.substring(1),
            params = {};

        if (hash.length < 5) {
            return params;
        }

        var vars = hash.split('&');
        for (var i = 0; i < vars.length; i++) {
            if (!vars[i]) {
                continue;
            }
            var pair = vars[i].split('=');
            if (pair.length < 2) {
                continue;
            }
            params[pair[0]] = parseInt(pair[1], 10);
        }

        return params;
    }

    function openFromURL($galleries) {
        // Parse URL and open gallery if it contains #&pid=3&gid=1
        var hashData = photoswipeParseHash();
        if (hashData.pid && hashData.gid) {
            let $gallery            = $galleries[hashData.gid - 1],
                pid                 = hashData.pid - 1,
                $imgs               = $gallery.find(getOptions($gallery).imgSelector),
                imgInfoArrayPromise = getImgInfoArray($imgs);

            imgInfoArrayPromise.done(function (imgInfoArray) {
                openPhotoSwipe(pid, $gallery, $imgs, imgInfoArray);
            });
        }
    }

    function addClickHandler($gallery, $imgs, imgInfoArray) {
        $gallery.on('click.photoswipe', getOptions($gallery).imgSelector, function (e) {
            e.preventDefault();
            openPhotoSwipe($(this).data('index'), $gallery, $imgs, imgInfoArray);
        });
    }

    function removeClickHandler($gallery) {
        $gallery.off('click.photoswipe');
    }

    function update($gallery) {
        var $imgs               = $gallery.find(getOptions($gallery).imgSelector),
            imgInfoArrayPromise = getImgInfoArray($imgs);

        addIndex($imgs);
        imgInfoArrayPromise.done(function (imgInfoArray) {
            removeClickHandler($gallery);
            addClickHandler($gallery, $imgs, imgInfoArray);
        });
    }

    $.fn.photoSwipe = function (imgSelector = 'img', options = {}, events = {}) {
        var defaultOptions = {
                bgOpacity: 0.973,
                showHideOpacity: true
            },
            globalOptions  = $.extend(defaultOptions, options);


        // Initialize each gallery
        var $galleries = [],
            isUpdate   = imgSelector === 'update';

        this.each(function () {
            if (isUpdate) {
                update($(this));
                return;
            }

            var $gallery            = $(this),
                $imgs               = $gallery.find(imgSelector),
                imgInfoArrayPromise = getImgInfoArray($imgs);

            addIndex($imgs);
            addUID($gallery);
            $galleries.push($gallery);

            // save options
            $gallery.data('photoswipeOptions', {imgSelector: imgSelector, globalOptions: globalOptions, events: events});

            imgInfoArrayPromise.done(function (imgInfoArray) {
                addClickHandler($gallery, $imgs, imgInfoArray);
            });
        });

        if (!isUpdate) {
            openFromURL($galleries);
        }

        return this;
    };

    // Attach original PhotoSwipe to $.fn.photoSwipe
    $.fn.photoSwipe.PhotoSwipe = PhotoSwipe;
}

/*------------------------------------*\
 # UMD
 \*------------------------------------*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('jqueryPhotoswipe', ['module', 'jquery'], factory);
    } else if (typeof module === 'object' && typeof module.nodeName !== 'string') {
        // CommonJS
        factory(module, require('jquery'));
    } else {
        // Browser globals
        if (typeof root.jQuery === 'function') {
            _factory(root.jQuery);
        }
    }
}(typeof window !== "undefined" ? window : this, function (module, jQuery) {
    module.exports = _factory(jQuery);
}));

export default PhotoSwipe;