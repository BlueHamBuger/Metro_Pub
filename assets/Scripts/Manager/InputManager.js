// Input Manager  集中处理所有的游戏输入（无关UI）
// Drawing 和  Input Manager 直接相关
cc.Class({
    extends: require("BaseManager"),

    ctor() {
        this.touchController = {
            touchTimes: 0,
            reset: function() {
                this.lastTouchCk = null;
                this.touchTimes = 0;
            },
        }
    },
    properties: {
        drawing: {
            default: null,
            type: require("Drawing"),
        },
    },
    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},
    initManager(gameMng) {


        //初始化参数
        this.gameMng = gameMng;
        //输入状态
        this.inputable = true;

        //输入事件注册
        this.node.on(cc.Node.EventType.TOUCH_START, this.OnTouchStart.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.OnBoardTouch.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_END, this.OnTouchEnd.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.OnTouchCancel.bind(this));

        // // 全局事件注册
        // this.gameMng.node.once('fallOver', function() { this.inputable = true }, this);
    },
    // update(dt) {
    //     if (this.touchController.lastTouchCk != null && this.touchController.isSame) {
    //         this.touchController.touchTimes += dt;
    //         this.touchController.lastTouchCk.Opacity += 15;
    //         if (this.hanZiContainer.getLength() == 1 && this.touchController.touchTimes >= 2) {
    //             this.touchController.isExped = true;
    //             this.gameMng.checkerMng.ExplosionManager.StartExplode(this.touchController.lastTouchCk.boardPos);
    //             this.OnTouchCancel();
    //         }
    //     }
    // },
    OnTouchStart(event) {
        if (!this.inputable) return;
        this.node.emit("touch_start", event)
            // var posX = event.getLocationX();
            // var posY = event.getLocationY();
            // if (!this.gameMng.checkerMng.boundingBox.contains(cc.v2(posX, posY))) { // 边界检查
            //     this.OnTouchCancel();
            // }
    },
    //erased 表示是否就行了擦除操作
    OnBoardTouch(event) {
        if (!this.inputable) return;
        this.node.emit("on_touch", event)
            //var erasedPos = this.drawing.OnTouchMove(event);
            // var posX = event.getLocationX();
            // var posY = event.getLocationY();
            // if (!this.gameMng.checkerMng.boundingBox.contains(cc.v2(posX, posY))) { // 边界检查
            //     this.OnTouchCancel();
            // }
    },
    OnTouchEnd(event) {
        if (!this.inputable) return;
        this.node.emit("touch_end", event)
            //this.drawing.ResetDrawing();
    },
    OnTouchCancel(event) {
        if (!this.inputable) return;
        this.node.emit("touch_cancle", event)
            //this.drawing.ResetDrawing();
        this.touchController.reset();
    },
    onDestroy() {
        // this.node.off(cc.Node.EventType.TOUCH_START);
        // this.node.off(cc.Node.EventType.TOUCH_MOVE);
        // this.node.off(cc.Node.EventType.TOUCH_END);
        // this.node.off(cc.Node.EventType.TOUCH_CANCEL);
        this.node.targetOff(this);
    },


});