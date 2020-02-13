// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

//TODO delete Test
var path = []
var curindex = -1
    //Test 

cc.Class({
    extends: cc.Component,


    properties: {
        stdDistance: {
            default: 20,
        },
        stdScale: {
            default: 3.0,
        },
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    onLoad() {
        this.graphics = this.node.getComponent(cc.Graphics);
        this.canvas = this.node.parent;
        this.lastPos = null;
        this.drawScale = 1.0;
        this.points = [];
        this.checkPoints = [];
        this.distance = [];
        this.curScale = this.stdScale;
        this.formerDist = 1.0;

        // 状态
        this._is_fading = false;


    },

    updateScale(dist) {
        var deltaDist = this.stdDistance - dist;
        var scale = this.stdScale + deltaDist * this.stdDistance * 0.01;
        if (scale < this.stdScale * 0.4) {
            scale = this.stdScale * 0.4;
        }
        return scale;
    },
    fsmooth(a, b, ratio) { // 一个 圆滑函数 将 ratio 映射到 0 到1 区间
        return a + (b - a) * (Math.sin(Math.PI * ratio - Math.PI / 2.0) + 1.0) / 2.0
    },
    OnTouchMove(event) {
        var mPos = event.getLocation();
        mPos = this.node.convertToNodeSpaceAR(mPos)

        // var points = this.graphics._impl._points; // 擦擦 准备
        // var DetectRect = new cc.Rect(mPos.x, mPos.y, 30.0, 30.0);
        // for (let i = 0; i < points.length - 5000; i += 100) {
        //     if (DetectRect.contains(points[i])) {
        //         var targetIndex = i;
        //         break;
        //     }
        // }
        // if (targetIndex) {
        //     for (let i = 0; i < this.checkPoints.length; i++) {
        //         if (targetIndex >= this.checkPoints[i].index) {
        //             this.curScale = this.checkPoints[i].scale;
        //             this.checkPoints.length = i + 1;
        //             break;
        //         }
        //     }
        //     this.ErasePath(targetIndex);
        //     var tarP = points[this.graphics._impl._pointsOffset - 50];
        //     var erasedPos = new cc.Vec2(tarP.x, tarP.y);
        //     this.points[0] = erasedPos;
        //     erasedPos = this.node.convertToWorldSpaceAR(erasedPos);
        //     this.points.length = 1;
        //     this.distance[0] = 0;
        //     this.distance.length = 1;
        // } else {
        this.Draw(mPos);
        //}
        return null;
    },
    //绘图相关
    resetDrawing() {
        this.points.length = 0;
        this.distance.length = 0;
        this.checkPoints.length = 0;
        this.graphics.clear();
        this.curScale = this.stdScale;
    },
    Draw(mPos) {
        // if(Math.abs(mPos.x)>= this.canvas.width/2.1 || Math.abs(mPos.y) >=this.canvas.height/2.1){
        //     //this.ResetDrawing();
        //     this.node.emit(cc.Node.EventType.TOUCH_CANCEL);
        //     return;
        // }
        if (this.points.length == 0) {
            this.distance.push(0.0);
        } else {
            this.distance.push(mPos.sub(this.points[this.points.length - 1]).mag());
        }
        this.points.push(mPos);
        if (this.points.length == 4) {
            //this.checkPoints

            var temp1 = this.points[1];
            //var temp2 = this.points[2];
            var middle = this.points[0].add(this.points[2]).div(2);
            this.points[1] = this.points[1].sub(middle).mul(1.5).add(middle);
            middle = temp1.add(this.points[3]).div(2);
            this.points[2] = this.points[2].sub(middle).mul(2.1).add(middle);
            //this.graphics.moveTo(this.points[0].x,this.points[0].y);
            var dist = this.distance[3] + this.distance[2] + this.distance[1];
            //距离长的 会使用 更多的拐点 来 模拟 三次贝塞尔曲线
            var num = dist / 4;
            if (num <= 1) num = 2;
            var rate = (dist / this.formerDist) > 1.0 ? 1.0 : dist / this.formerDist;
            //var scale = this.updateScale(dist * rate);
            var scale = this.stdScale
                // 起始点不从0 开始 保证线条起始位置 木有 毛刺
            for (let index = 1; index < num; index++) {
                var t1 = (1.0 / num) * index;
                var target = this.points[0].mul(Math.pow(1.0 - t1, 3)).add(
                    this.points[1].mul(3 * t1 * Math.pow(1.0 - t1, 2)).add(
                        this.points[2].mul(3 * t1 * t1 * (1.0 - t1)).add(
                            this.points[3].mul(Math.pow(t1, 3))
                        )));
                var smoothScale = scale
                this.graphics.circle(target.x, target.y, smoothScale);
            }
            this.graphics.fill();
            // 控制最小的 绘画距离
            if (dist >= 15.0) {
                this.formerDist = dist;
                this.curScale = smoothScale;
            }
            this.points[0] = target;
            this.points[1] = this.points[3];
            this.distance[0] = this.distance[2];
            this.distance[1] = this.distance[3];
            this.points.length = 2;
            this.distance.length = 2;

            // 获取当前的 点的位置
            this.checkPoints.push({
                index: this.graphics._impl._pointsOffset - 1,
                scale: this.curScale
            });
        }
    },
    ErasePath(targetIndex) { // 擦除函数 暂且不用
        var impl = this.graphics._impl;
        // 一次要擦除的点的 数量
        var dist = impl._pointsOffset - targetIndex;
        var subr = 0;
        var pathDist = 0;
        for (let i = 0; i < impl._pathLength; i++) {
            subr += impl._paths[impl._pathLength - 1 - i].points.length;
            if (subr >= dist) {
                pathDist = i + 1;
                break;
            }
        }
        impl._pointsOffset -= dist;
        impl._points.length = impl._pointsOffset;


        impl._pathLength -= pathDist;
        impl._paths.length = impl._pathLength;
        impl._curPath = impl._paths[impl._pathLength - 1];

        impl._pathOffset = 0;
        this.graphics._assembler._bufferOffset = 0
        this.graphics._assembler.clear();
        this.graphics.fill();
    },
    PathFade() { // 线路消失  speed 和地铁运行速度相关
        var speed = 2
        var impl = this.graphics._impl;
        var assembler = this.graphics._assembler;
        if (impl._paths == 0) { this.stopFade(); return; }

        speed = impl._paths.length < speed ? impl._paths.length : speed
        var fade_point_num = 0
        for (let i = 0; i < speed; i++) {
            fade_point_num += impl._paths[i].points.length;
        }
        impl._points = impl._points.slice(fade_point_num)
        impl._pointsOffset -= fade_point_num

        impl._paths = impl._paths.slice(speed)
        impl._pathLength -= speed
        impl._pathOffset = 0;

        assembler._bufferOffset = 0
        assembler.clear();
        this.graphics.fill();
    },
    //  外部回调
    startFade(speed) {
        if (this._is_fading) {
            return;
        }
        path = this.graphics._impl._paths;
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        this.schedule(this.PathFade, 0.01)
        this._is_fading = true
    },
    stopFade() {
        this.unschedule(this.PathFade)
        this._is_fading = false
    },
    isFaded() { // 轨迹是否完全淡去
        return this.graphics._impl._points.length == 0
    },
    getTail() { // 获取尾部结点的 位置
        let path = this.graphics._impl._paths[0]
        if (path != null) {
            return path.points[Math.floor(path.points.length - 1)];
        } else {
            return null
        }
    },
    getDir() { // 获取 当前尾部的运动方向
        let paths = this.graphics._impl._paths
        if (paths[3] == null) return null
        return paths[3].points[0].sub(paths[0].points[0]).normalize();
    },
    getHead() { // 获取头部节点 的 位置
        return this.graphics._impl._points[this.graphics._impl._points.length - 1]
    },

    //TODO DELETE TEST
    onKeyDown: function(event) {
        switch (event.keyCode) {
            case cc.macro.KEY.left:
                var impl = this.graphics._impl;
                var assembler = this.graphics._assembler;
                if (path.length == 0) return;
                curindex--;
                impl._paths = path.slice(curindex, curindex + 1);
                impl._pathLength = 1
                impl._points = impl._paths[0].points
                impl._pointsOffset = impl._points.length
                impl._pathOffset = 0;

                assembler._bufferOffset = 0
                assembler.clear();
                this.graphics.fill();
                break;
            case cc.macro.KEY.right:
                var impl = this.graphics._impl;
                var assembler = this.graphics._assembler;
                if (path.length == 0) return;
                curindex++;
                impl._paths = path.slice(curindex, curindex + 1);
                impl._pathLength = 1
                impl._points = impl._paths[0].points
                impl._pointsOffset = impl._points.length
                impl._pathOffset = 0;
                assembler._bufferOffset = 0
                assembler.clear();
                this.graphics.fill();
                break;
        }
    },

});