define("matcha/overlay/1.0.0/overlay-debug", [ "jquery-debug", "matcha/widget/1.0.0/widget-debug", "matcha/position/1.0.0/position-debug", "matcha/iframeshim/1.0.0/iframeshim-debug" ], function(require, exports, module) {
    var $ = require("jquery-debug");
    var Widget = require("matcha/widget/1.0.0/widget-debug");
    var Position = require("matcha/position/1.0.0/position-debug");
    var Iframeshim = require("matcha/iframeshim/1.0.0/iframeshim-debug");
    var Overlay = Widget.extend({
        attrs: {
            width: null,
            // 浮层宽度
            height: null,
            // 浮层高度
            visible: false,
            // 显示状态
            blurHide: true,
            // 失去焦点时，是否自动隐藏
            zIndex: 99,
            // 定位配置
            align: {
                // element 的定位点，默认为左上角
                elementPos: "0 0",
                // 基准定位元素，默认为当前可视区域
                targetNode: false,
                // 基准定位元素的定位点，默认为左上角
                targetPos: "0 0"
            }
        },
        /**
         * 初始化iframe遮罩层
         * @private
         */
        _setupShim: function() {
            var self = this;
            var iframeShim = new Iframeshim(self.$el);
            self._iframeShim = iframeShim;
        },
        /**
         * 定位操作
         * @returns {Overlay}
         * @private
         */
        _setPosition: function() {
            var self = this;
            // 不在文档流中，定位无效
            if (!$.contains(document.documentElement, self.el)) {
                return;
            }
            var align = self.get("align");
            if (!align) {
                return;
            }
            var isHidden = self.$el.css("display") === "none";
            // 在定位时，为避免元素高度不定，先显示出来
            if (isHidden) {
                self.$el.css({
                    visibility: "hidden",
                    display: "block"
                });
            }
            Position({
                element: self.$el,
                pos: align.elementPos
            }, {
                element: align.targetNode,
                pos: align.targetPos
            });
            if (isHidden) {
                self.$el.css({
                    visibility: "",
                    display: "none"
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
        _blurHide: function(arr) {
            var self = this;
            arr = $.makeArray(arr);
            arr.push(self.$el);
            self._relativeElements = arr;
        },
        _onChangeWidth: function(val) {
            var self = this;
            self.$el.css("width", val);
            self._iframeShim.position();
        },
        _onChangeHeight: function(val) {
            var self = this;
            self.$el.css("height", val);
            self._iframeShim.position();
        },
        _onChangeZIndex: function(val) {
            this.$el.css("zIndex", val);
        },
        _onChangeAlign: function() {
            this._setPosition();
        },
        _onChangeVisible: function(val) {
            this.$el[val ? "show" : "hide"]();
        },
        setup: function() {
            var self = this;
            self._setupShim();
            // 加载 iframe 遮罩层并与 overlay 保持同步
            self._setupResize();
        },
        /**
         * 渲染组件
         * @returns {Overlay}
         */
        render: function() {
            var self = this;
            Widget.prototype.render.apply(self, arguments);
            var position = self.$el.css("position");
            if (position === "static" || position === "relative") {
                self.$el.css({
                    position: "absolute",
                    left: "-9999px",
                    top: "-9999px"
                });
            }
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
            self.set("visible", true);
            self._setPosition();
            return self;
        },
        /**
         * 隐藏浮层
         * @returns {Overlay}
         */
        hide: function() {
            var self = this;
            self.set("visible", false);
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
    $(document).on("mousedown", function(event) {
        eachOverlays(function(instance) {
            // 当实例为 空 或 隐藏 或 blurHide不启用 时，不处理
            if (!instance || !instance.get("visible") || !instance.get("blurHide") || !instance._relativeElements) {
                return;
            }
            // 遍历 _relativeElements ，当点击的元素落在这些元素上时，不处理
            var i = 0, len = instance._relativeElements.length;
            var el;
            for (;i < len; i++) {
                el = $(instance._relativeElements[i])[0];
                if (el === event.target || $.contains(el, event.target)) {
                    return;
                }
            }
            // 到这里，判断触发了元素的 blur 事件，隐藏元素
            instance.hide();
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
                    if (!!instance.get("visible")) {
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
