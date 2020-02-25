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
var States = window.GB_LineStates = {
    BUILD: 0, //建造中
    RUN: 1, // 行驶中
    WAIT: 2, // 接收乘客
    DONE: 3 // 到达路线结尾
}
var MetroLine = cc.Class({
    extends: cc.Component,
    properties: {
        speed: 1, // 速度 代表 车辆前进的长度
        state: {
            //路线当前的状态 building 为 建造中  running 为  运行中  
            get() {
                return this._state
            },
            set(value) {
                if (this._state != value) { // 状态变化
                    this.onStateExit(this._state)
                    this.onStateEnter(value)
                    this._state = value
                }
            }
        },
    },
    ctor() {
        this.entities = []
        this.car_pos = null
        this._state = States.BUILD
        this._next_state = States.BUILD // 下一个状态
        this.passed_stations = 0
        this.cur_entity = null //记录当前的站点
    },
    onLoad() {
        this._initEffects()

    },
    _initEffects() { //TODO 分离表现层
        this.graphic = this.node.getComponent("Drawing"); // 轨迹的图像处理类
        this.graphic.init(this)
        this.car = MetroLine.metro_mng.getCarInstance()
        this.car.node.setParent(this.node.parent.parent)
        let cnet_line_pre = MetroLine.metro_mng.getEffect(window.GB_Effect.CONNECT_LINE, 0) //TODO index 配置化
        this.cnet_lines = function(that) { // 0到8 分别暗示 周边9个格子
            let a = []
            for (let i = 0; i < 9; i++) {
                let cnet_line = cc.instantiate(cnet_line_pre)
                cnet_line.setParent(that.node)
                cnet_line.active = false
                a.push(cnet_line)
            }
            return a
        }(this)
    },
    update(dt) {
        let pos = this.getCarPos()
        if (pos != null) this.car_pos = pos
        this.state = this._next_state
        this.onState(this.state, dt)
    },
    // 对象池回调
    unuse: function() {
        this.entities.length = 0
        this.speed = 1
        this.state = States.BUILD
        this._next_state = States.BUILD
        this.node.active = false
        this.car_pos = null
        this.end_pos = null
        this.passed_stations = 0
        this.cur_entity = null
        this.extra_bonus = 0 // 额外的bonus计算
    },
    reuse: function(speed, bandwidth) {
        this._default_speed = speed //TODO speed 将会从 车速 和 线路本身速度共同决定
        this.node.active = true;
    },
    // Manager 交互
    buildOver() { // 路线构建完毕  开始进行运输
        if (!this.graphic.hasRoute()) { // 没有任何的行径路线
            this.graphic.resetDrawing()
            MetroLine.metro_mng.fadeLine(this)
            return
        }
        this._computeExtraBonus() // 计算bonus
        this._next_state = States.RUN
    },
    build(pos, entity) { // 根据对应的新位置来 构建路线
        if (this.car_pos == null)
            this.car_pos = pos
        this.end_pos = pos
        pos = this.node.convertToNodeSpaceAR(pos)
        this.graphic.Draw(pos, entity) // 更新视觉效果
    },
    addStation(entity) {
        if (this.entities.length != 0 && entity == this.entities[this.entities.length - 1]) { // 如果和上一个站位为同一站则不添加
            return
        }
        this.graphic.addRoute(entity, 1)
        this.entities.push(entity) // 可以重复加入同一个 站点
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
        return this.car.isEmpty()
    },
    // 动作
    _spreadPop() { //根据距离 在对应的 entities 中分散人群
        let entities = arguments
            // 返回 对应的 缓动对象
        let dists = []
        dists.length = entities.length
        let total_dist = 0
        let time = 0.5
        for (let i = 0; i < entities.length; i++) {
            if (entities[i] == null) continue
            let entity_pos = entities[i].node.getPosition()
            let distance = this.car_pos.sub(entity_pos).mag()
            total_dist += distance
            dists[i] = distance
        }
        let pop = this.car.cur_pop
        let rest = pop

        let tweens = []
        let last_idx = 0
        for (let i = 0; i < entities.length - 1; i++) {
            if (entities[i] == null) continue
            let num = Math.floor((dists[i] / total_dist) * pop)
            rest -= num
            tweens.push(entities[i].crowdIn(num, time, this))
            last_idx = i
        }
        tweens.push(entities[last_idx].crowdIn(rest, time, this))

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
            case States.BUILD:
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
    onRunEnter() {
        let speed_factor = 1
        this.speed = this._default_speed * (speed_factor + this.extra_bonus)
    },
    onRun() {
        if (!this.graphic.hasRoute()) { // 运输完毕
            this._next_state = States.DONE
            return
        }
        let next_station = this.entities[0]
        if (next_station != null && next_station.isIn(this.car_pos)) { // 进入站点/ 出口 进行 处理
            if (this.entities.length == 1 && next_station.isIn(this.end_pos)) { // 是最后一个站点 并且 最终的结点在该站点上
                return; // 直接顺势进入到 Done 状态
            }
            this._next_state = States.WAIT;
        }
        this.graphic.onRun(this.speed) // 持续调用 防止 speed 的中途变换
        this.car.onRun(this.car_pos, this.graphic.getDir())
    },
    onRunExit() {},
    onBuildEnter() {

    },
    onBuild(deltatime) {
        // 视觉效果     
        let adj_entities = MetroLine.metro_mng.getAdjancents(this.end_pos)
        if (adj_entities != null && adj_entities.length != null) {
            for (let i = 0; i < adj_entities.length; i++) {
                let adj = adj_entities[i]
                if (adj == null) {
                    this.cnet_lines[i].active = false
                    continue
                }
                let dir = adj.node.getPosition().sub(this.end_pos)
                let dist = dir.mag()
                if (this.cnet_lines[i].active == false) {
                    this.cnet_lines[i].active = true
                    this.cnet_lines[i].getComponent(cc.Animation).play()
                }
                this.cnet_lines[i].setPosition(this.end_pos)
                this.cnet_lines[i].height = dist
                this.cnet_lines[i].angle = Math.raduis2Angle(cc.Vec2.UP.signAngle(dir))
            }
        } else {
            this.cnet_lines.forEach(cnet_line => {
                cnet_line.active = false
            });
        }
    },
    onBuildExit() {
        this.graphic.onBuildExit(this.speed)
        this.car_pos = this.entities[0].node.position
        this.car.ready(this.car_pos, this.graphic.getDir())
    },
    /// Wait
    onWaitEnter() {
        this.passed_stations++;
        this.graphic.onWaitEnter()
        this.cur_entity = this.entities[0]
        this.cur_entity.wait(this).call(() => {
            this._next_state = States.RUN
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
        if (adj_entities == null) {
            //TODO 扣分
            this._lineFade()
            return
        } else if (adj_entities.length == null) { //终点在 某个实体内
            var tweens = this._spreadPop(adj_entities)
        } else {
            var tweens = this._spreadPop(...adj_entities)
        }
        am.Parallel(...tweens, () => {
            if (this.isEmpty()) { // 运算完毕
                this._lineFade()
                return
            }
            // 没有完全输送完毕
            this._next_state = States.RUN
        })
    },
    onDone(deltatime) {

    },
    onDoneExit() {

    },




    // 站点交互
    vanishStation(station) { // 站点消失回调
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
        this.passed_stations -= step;
    },
    updatePop(delta_pop) { // 要求使用指定的  delta_pop 来更新线路的当前人数，并且返回确实更新的人数
        return this.car.getOn(delta_pop)
    },

    // 私有
    _lineFade() { // 线路消失
        this.car.onRunExit()
        this.graphic.resetDrawing()
        MetroLine.metro_mng.fadeLine(this)
    },
    _computeExtraBonus() { //计算bonus bonus 用于加分
        //this.extra_bonus
        let entities = this.entities
        let common_line = entities[0] // 判断
        let sequenced = true // 是否有序（逆序或是正序）
        var seq = null // 当前线路的正逆序 true 为正序 否则为逆序
        for (let i = 1; i < entities.length - 1; i++) { // 不含终点
            let seq_temp = entities[i].station_id > entities[i]
            if (common_line != entities[i].line) {
                sequenced = null
                break
            }
            if (seq != null && seq != seq_temp) { // 序列非有序
                sequenced = false
            }
        }
        if (sequenced == null) { //非同一线路
            this.extra_bonus = 1
        } else if (sequenced == true) {
            this.extra_bonus = 1.2
        } else if (sequenced == false) {
            this.extra_bonus = 1.4
        }
    }

});