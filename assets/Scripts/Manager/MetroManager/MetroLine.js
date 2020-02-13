// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

var am = require("AnimationManager")
var States = window.LineStates = {
    BUILD: "building", //建造中
    RUN: "running", // 行驶中
    WAIT: "waiting", // 接收乘客
    DONE: "done" // 到达路线结尾
}
var MetroLine = cc.Class({
    extends: cc.Component,
    properties: {
        speed: 1, // 速度 代表 车辆前进的长度
        bandwidth: 100, // 带宽(运力)
        state: {
            //路线当前的状态 building 为 建造中  running 为  运行中  
            get() {
                return this._state
            },
            set(value) {
                if (this._state != value) { // 状态变化
                    this.onStateExit(this._state)
                    this.onStateEnter(value)
                }
                this._state = value
            }
        },
    },
    ctor() {
        this.cur_pop = 0 // 当前运输的人数
        this.entities = []
        this.cur_wait_time = 0 // 在站点上已经等待的时间
        this.car_pos = null
        this._state = States.BUILD
        this.route_points = [] // 记录路线上的关键点
    },
    onLoad() {
        this.graphic = this.node.getComponent("Drawing"); // 轨迹的图像处理类
        this.pop_label = this.node.getComponentInChildren(cc.Label)

    },
    start() {
        this.car = cc.find("Car").getComponent("MetroCar");
    },
    update(dt) {
        // test
        this.pop_label.string = this.cur_pop
        let pos = this.getCarPos()
        if (pos != null) this.car_pos = pos
        if (this.car_pos != null)
            this.pop_label.node.setPosition(this.car_pos)
        this.onState(this.state, dt)
    },
    // 对象池回调
    unuse: function() {
        this.entities.length = 0
        this.speed = 1
        this.bandwidth = 100
        this.state = States.BUILD
        this.node.active = false
        this.cur_wait_time = 0
        this.car_pos = null
        this.end_pos = null
        this.cur_pop = 0
        this.route_points.length = 0
    },
    reuse: function(speed, bandwidth) {
        this.speed = speed
        this.bandwidth = bandwidth
        this.node.active = true;
    },

    // Manager 交互
    buildOver() { // 路线构建完毕  开始进行运输
        this.state = States.RUN
    },
    build(pos) { // 根据对应的新位置来 构建路线
        if (this.car_pos == null) this.car_pos = pos
        let length = this.route_points.length
        if (length >= 1) {
            let dist = pos.sub(this.route_points[length - 1]).mag()
            if (dist <= MetroLine.min_draw_distance) { // 如果距离太小 则 不进行绘制
                return
            }
        }
        this.route_points.push(pos)
        this.end_pos = pos
        pos = this.node.convertToNodeSpaceAR(pos)
        this.graphic.Draw(pos) // 更新视觉效果
    },
    addStation(station) {
        //if (this.hasStation(station)) return false; //TODO 考虑是否可以重复加入同一个 station
        this.entities.push(station) // 可以重复加入同一个 站点
        return true;
    },

    // 状态
    hasStation(station) { // 判断是否已有对应的 station
        return this.entities.indexOf(station) != -1
    },
    getCarPos() { // 获取运行路线上车辆的位置
        return this.graphic.getTail() // 先取 画出的线段的最末端作为车辆位置
    },
    isEmpty() { // 是否还有乘客
        return this.cur_pop == 0
    },
    // getCarDir() { // 给定 所处路线的索引(代表路段)  来决定当前的行径方向
    //     // if (this.route_points.length <= 1) {
    //     //     return null
    //     // }
    //     // return this
    //     // if (arr == null) {``
    //     //     return this.route_points[1].sub(this.route_points[0]).normalize()
    //     // } else {
    //     //     let start_i = this._getRouteIndex(arr[arr_i], pos)
    //     //     console.log(start_i + "/" + this.route_points.length);
    //     //     arr[arr_i] = start_i
    //     //     return this.route_points[start_i + 1].sub(this.route_points[start_i]).normalize()
    //     // }
    // },
    // _getRouteIndex(start_i, pos) { // 根据 路线的索引 和 当前的位置 来得到最新的
    //     let min_dist = this.route_points[start_i].sub(pos).mag()
    //     let min_i = start_i
    //     let limit = start_i + 3 > this.route_points.length ? this.route_points.length : start_i + 3
    //     for (let i = start_i + 1; i < limit; i++) { //TODO 参数化 最多向前看n个点
    //         let dist = this.route_points[i].sub(pos).mag()
    //         if (min_dist > dist) {
    //             min_i = i
    //         }
    //     }
    //     return min_i
    // },
    // 动作
    _spreadPop() { //根据距离 在对应的 entities 中分散人群
        let entities = arguments
            // 返回 对应的 缓动对象
        let dists = []
        let total_dist = 0
        let time = 0.5
        for (let i = 0; i < entities.length; i++) {
            let entity_pos = entities[i].node.getPosition()
            let distance = this.car_pos.sub(entity_pos).mag()
            total_dist += distance
            dists.push(distance)
        }
        let rest = this.cur_pop
        let tweens = []
        for (let i = 0; i < entities.length - 1; i++) {
            let num = Math.floor((dists[i] / total_dist) * this.cur_pop)
            rest -= num
            tweens.push(entities[i].crowdIn(num, time, this))
        }
        tweens.push(entities[entities.length - 1].crowdIn(rest, time, this))

        return tweens
    },
    //状态机
    //TODO 状态机单独成类，高内聚
    onStateEnter(state) {
        switch (state) {
            case States.Build:
                this.onBuildEnter()
                break;
            case States.RUN:
                this.onRunEnter()
                break;
            case States.WAIT:
                this.onWaitEnter()
                break;
            case States.DONE:
                this.onDoneEnter()
                break;
        }
    },
    onStateExit(state) {
        switch (state) {
            case States.BUILD:
                this.onBuildExit()
                break;
            case States.RUN:
                this.onRunExit()
                break;
            case States.WAIT:
                this.onWaitExit()
                break;
            case States.DONE:
                this.onDoneExit()
                break;
        }
    },
    onState(state, dt) {
        switch (state) {
            case States.Build:
                this.onBuild(dt)
                break;
            case States.RUN:
                this.onRun(dt)
                break;
            case States.WAIT:
                this.onWait(dt)
                break;
            case States.DONE:
                this.onDone(dt)
                break;
        }
    },
    /// Run
    onRunEnter() {},
    onRun() {
        if (this.graphic.isFaded()) { // 运输完毕
            this.state = States.DONE
            return
        }
        this.graphic.startFade(this.speed) // 持续调用 防止 speed 的中途变换
        this.car.onRun(this.car_pos, this.graphic.getDir())
        let next_station = this.entities[0]
        if (next_station == null) return;
        if (next_station.isIn(this.car_pos)) { // 进入站点/ 出口 进行 处理
            this.cur_wait_time = 0
            if (this.entities.length == 1 && next_station.isIn(this.end_pos)) { // 是最后一个站点 并且 最终的结点在改站点上
                return;
            }
            this.state = States.WAIT;
        }
    },
    onRunExit() {},
    onBuildEnter() {

    },
    onBuild(deltatime) {

    },
    onBuildExit() {
        this.car.onRunEnter(this.car_pos, this.graphic.getDir(), this)
    },
    /// Wait
    onWaitEnter() {
        this.graphic.stopFade()
        let cur_entity = this.entities[0]
        cur_entity.wait(this).call(() => {
            this.state = States.RUN
            let cur_entity = this.entities.shift() // count when u shift for score-computing
            if (!this.hasStation(cur_entity)) { // 其已经不在路线规划中了
                //TODO 响应出列
            }
        }).start()
    },
    onWait(deltatime) {},
    onWaitExit() {

    },
    /// Done
    onDoneEnter() {
        let adj_entities = MetroLine.metro_mng.getAdjancents(this.car_pos)
        if (adj_entities.length == null) { //终点在 某个实体内
            var tweens = this._spreadPop(adj_entities)
        } else if (adj_entities.length == 0) {
            //TODO 扣分
            this.state = States.BUILD
            this.graphic.resetDrawing()
            MetroLine.metro_mng.fadeLine(this)
            return
        } else {
            var tweens = this._spreadPop(...adj_entities)
        }
        am.Parallel(...tweens, () => {
            if (this.isEmpty()) { // 运算完毕
                this.state = States.BUILD
                this.graphic.resetDrawing()
                MetroLine.metro_mng.fadeLine(this)
                return
            }
            // 没有完全输送完毕
            this.state = States.RUN
        })
    },
    onDone(deltatime) {

    },
    onDoneExit() {
        this.car.onRunExit()
    },




    // 站点交互
    vanishStation(station) {
        //TODO vanish
        let idx = this.entities.indexOf(station)
        let step = 0 // 前进步长
        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i + step]
            if (station == entity) {
                i--
                step++
                continue
            }
            if (step == 0)
                continue
            else if (i + step == this.entities.length) {
                break;
            }
            this.entities[i] = this.entities[i + step]
        }
        this.entities.length -= step;
    },
    updatePop(delta_pop) { // 要求使用指定的  delta_pop 来更新线路的当前人数，并且返回确实更新的人数
        let tar_pop = this.cur_pop + delta_pop
        if (tar_pop < 0) { // 减法
            delta_pop = -this.cur_pop // 
            tar_pop = 0;
        } else if (tar_pop > this.bandwidth) { // 加法
            tar_pop = this.bandwidth
            delta_pop = this.bandwidth - this.cur_pop
        }
        this.cur_pop = tar_pop
        return delta_pop
    }




});