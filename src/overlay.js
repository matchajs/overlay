define(function(require, exports, module) {
    var $ = require('jquery');
    var Widget = require('widget');

    var Position = require('position');
    var Iframeshim = require('iframeshim');

    var Overlay = Widget.extend({
        attrs: {
            width: null, // 浮层宽度
            height: null, // 浮层高度
            visible: false, // 显示状态
            blurHide: false, // 失去焦点时，是否自动隐藏
            zIndex: 99,

            // 定位配置
            align: {
                // element 的定位点，默认为左上角
                elementPos: '0 0',

                // 基准定位元素，默认为当前可视区域
                targetNode: false,

                // 基准定位元素的定位点，默认为左上角
                targetPos: '0 0'
            }
        },

        /**
         * 初始化iframe遮罩层
         * @private
         */
        _setupShim: function() {
            var self = this;

            var iframeShim = new Iframeshim(self.$el);

            // size改变时, 需重新定位
            var resize = function() {
                iframeShim.position();
            };
            self.on('change:width', resize);
            self.on('change:height', resize);

            self._iframeShim = iframeShim;
        },

        /**
         * 定位操作
         * @returns {Overlay}
         * @private
         */
        _setPosition: function() {
            var self = this;

            var align = self.get('align');

            if (!!align) {
                Position({
                    element: self.$el,
                    pos: align.elementPos
                }, {
                    element: align.targetNode,
                    pos: align.targetPos
                });
            }

            self._iframeShim.position();

            return self;
        },

        /**
         * resize窗口时重新定位浮层，用这个方法收集所有浮层实例
         * @private
         */
        _setupResize: function() {
            Overlay.allOverlays.push(this);
        },

        setup: function() {
            var self = this;

            self._setupShim(); // 加载 iframe 遮罩层并与 overlay 保持同步
            self._setupResize();// 窗口resize时，重新定位浮层

            // 属性更新操作
            self.on('change:width', function(model, val) {
                self.$el.css('width', val);
            });
            self.on('change:height', function(model, val) {
                self.$el.css('height', val);
            });
            self.on('change:zIndex', function(model, val) {
                self.$el.css('zIndex', val);
            });
            self.on('change:align', function() {
                self._setPosition();
            });
            self.on('change:visible', function(model, val) {
                self.$el[val ? 'show' : 'hide']();
            });
        },

        /**
         * 渲染组件
         * @returns {Overlay}
         */
        render: function() {
            var self = this;

            Widget.prototype.render.apply(self, arguments);

            var position = self.$el.css('position');
            if (position === 'static' || position === 'relative') {
                self.$el.css({
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px'
                });
            }

            var overlayWidth = self.get('width');
            overlayWidth && self.$el.css('width', overlayWidth);

            var overlayHeight = self.get('height');
            overlayHeight && self.$el.css('height', overlayHeight);

            return self;
        },

        /**
         * 显示浮层
         * @returns {Overlay}
         */
        show: function() {
            var self = this;

            if (!self.rendered) {
                self.render();
            }

            self.set('visible', true);

            self._setPosition();

            return self;
        },

        /**
         * 隐藏浮层
         * @returns {Overlay}
         */
        hide: function() {
            var self = this;

            self.set('visible', false);

            self._iframeShim.hide();

            return self;
        },

        /**
         * 移除浮层
         * @returns {Overlay}
         */
        remove: function() {
            var self = this;

            self._iframeShim.remove();

            eachOverlays(function(instance, i) {
                if (self === instance) {
                    this.splice(i, 1);
                    return this;
                }
            });

            Widget.prototype.remove.apply(self, arguments);

            return self;
        }
    });

    // 存放所有浮层实例
    Overlay.allOverlays = [];

    module.exports = Overlay;

    // 浮层隐藏
    $(document).on('mousedown', function() {
        eachOverlays(function(instance) {
            instance.get('blurHide') && instance.hide();
        });
    });

    // 绑定 resize 重新定位事件
    var $win = $(window);
    var winWidth, winHeight, resizeTimer;
    $win.resize(function() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
            resizeTimer = null;
        }

        resizeTimer = setTimeout(function() {
            var newWidth = $win.width();
            var newHeight = $win.height();

            if (newWidth !== winWidth || newHeight !== winHeight) {
                eachOverlays(function(instance) {
                    if (!!instance.get('visible')) {
                        instance._setPosition();
                    }
                });

                winWidth = newWidth;
                winHeight = newHeight;
            }
        }, 50);
    });

    function eachOverlays(fn) {
        var cahceOverlays = Overlay.allOverlays;
        for (var i = 0, len = cahceOverlays.length; i < len; i++) {
            fn.call(cahceOverlays, cahceOverlays[i], i);
        }
    }
});