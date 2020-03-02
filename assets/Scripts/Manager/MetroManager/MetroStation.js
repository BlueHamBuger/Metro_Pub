var FSM = require("StateMachine")
var State = window.GB_StationState = {
    Normal: 0,
    Fastigium: 1,
    Packed: 2,
    Vanish: 3,
}
var StationApperance = cc.Class({ // MetroStation的 外观信息和更新逻辑
    name: "StationApperance",
    properties: {
        name_text: {
            default: null,
            type: cc.Label,
        },
        population_text: {
            default: null,
            type: cc.Label,
        },
        station_sprite: {
            default: null,
            type: cc.Sprite
        },
        particles: {
            default: null,
            type: cc.ParticleSystem
        },
        line_idx_sprite: {
            default: null,
            type: cc.Sprite,
        },
        line_idx_label: {
            default: null,
            type: cc.Label
        },
        line_name_label: {
            default: null,
            type: cc.Label
        }

    },
    __ctor__(sta) {
        this.metro_station = sta
    },
    init() {},
    onReuse(station) {
        this.name_text.string = station.info.station_name;
        this.station_sprite.node.color = station.city_data.color; //TODO color 的设置细化
        this.station_sprite.getComponent(cc.Sprite).spriteFrame = station.city_data.tex
        this.line_idx_sprite.node.color = station.line_data.color
        this.line_idx_sprite.spriteFrame = station.city_data.tex
        this.line_idx_label.string = station.line_data.station.indexOf(station.info) + 1
        this.line_name_label.string = station.line_data.line_name.split("号")[0]
    },
    onPopUpdate(value, limit) {
        this.population_text.string = value + "\\" + limit;
        this.particles.totalParticles = value / 2
        this.particles.angleVar = value / limit * 180
    },
    getBoundingBox() {
        return this.station_sprite.node.getBoundingBoxToWorld()
    }


})
var MetroStation = cc.Class({
    extends: require("MetroEntity"),
    statics: {
        StateFunc: FSM.genFuncs(State)
    },
    properties: {
        // 属性
        population_limit: { // 应该要和 车站的node 的 scale 挂钩
            default: 100,
            type: cc.Integer,
        },
        cur_population: {
            override: true,
            type: cc.Integer,
            get() {
                return Math.floor(this._cur_pop);
            },
            set(value) {
                this._cur_pop = value
                if (this.cur_population >= this.population_limit) {
                    this._cur_pop = this.population_limit
                    let state = this.anim.getAnimationState("packing")
                    state.repeatCount = 0
                } else if (this.cur_population >= this.population_limit * MetroStation.pack_rate) {
                    if (this.pend_packed == false) this.pend_packed = true
                } else {
                    this.pend_packed = false
                }
                // else if (this.pend_packed) {
                //     let rate = (this.cur_population - this.population_limit) / this.population_limit
                //     if (rate >= MetroStation.vanish_rate) { // 当爆满达到一定比例之后将会消失

                //     }
                // }
                this.apperance.onPopUpdate(this.cur_population, this.population_limit)
            }
        },
        crowd_factor: 1, // 增长速率  应该和**挂钩
        station_id: {
            default: 0,
            type: cc.Integer
        },
        // 状态
        pend_packed: {
            get() {
                return this._pend_packed
            },
            set(value) {
                if (value == this._pend_packed) {
                    return
                } else if (value == true) { // 播放动画等等
                    let state = this.anim.getAnimationState("packing")
                    state.repeatCount = Infinity
                    this.anim.play("packing")
                } else {
                    let state = this.anim.getAnimationState("packing")
                    state.repeatCount = 0
                }
                this._pend_packed = value
            }
        },
        apperance: {
            default: null,
            type: StationApperance
        }
    },
    ctor() {
        this._pend_packed = false
        this.fsm = new FSM(MetroStation.StateFunc, this)
    },
    init() {
        this._super()
        this.apperance.init()
    },
    update(dt) {
        this.fsm.update()
    },
    unuse: function() {
        this._super()
        this.unschedule(this.crowdGrow, this);
        this.fsm.setState(null)
    },
    //crowdFactor, name, color, cellindex, scale, 
    reuse: function(limit, station_info, cellindex, scale) { // 重用函数  
        this._super(cellindex, scale)
        for (const key in station_info) {
            this[key] = station_info[key]
        }
        this.fsm.reset(null)
        this.info.exist = true
        this.apperance.onReuse(this)
        this.cur_population = 0;
        this.anim.play("spawning")
    },
    // MetroManager 调用接口
    /// 动作
    onTouch() {
        this.node.setScale(this.default_scale.mul(1.2))
    },
    onTouchEnd() {
        this.node.setScale(this.default_scale)
    },




    onAdded(line) { // 被加入到 路线中
        if (this._lines.indexOf(line) != -1) { //已存在
            return false;
        }
        this._lines.push(line)

        // 图像
        // let scale = 
        // this.node.setScale()
    },
    /// 状态
    isIn(pos) { // 判断 对应的 点的位置 是否在该station 的范围内
        var bounding_rect = this.apperance.getBoundingBox()
        return bounding_rect.contains(pos);
    },



    // 站点动作调用
    onPopUpdate(tween, delta, line) {
        let tar_pop = this.cur_population + delta
        if (tar_pop < 0) {
            delta = -this.cur_population
        }
        if (line != null) {
            delta = -line.updatePop(-delta) // 线路的增加量为 相反数    
        }
        return delta // 返回真实的delta
    },
    getWaitNumber() {
        return -this.wait_time * 100
    },
    vanish() { //站点因为 爆满  或是 到达生命周期 而 消失
        MetroStation.metro_mng.vanishStation(this); // 站点消去
        this.info.exist = false
        for (let line of this._lines) {
            line.vanishStation(this) // 通知包含该站点的 所有线路
        }
        this._lines.length = 0
    },
    crowdGrow() { // 人群自然增长 通过 schedule 方法来 定期调用，调用的间隔由   crowd_factor来决定
        this.cur_population++;
    },
    // 状态机函数
    onFastigiumEnter() {
        this.crowdIn(this.fastigium_pop, 2).call(() => { //高峰期持续 2s
            // if (this.fsm.getState() == State.Vanish)
            //     return
            this.fastigium--;
            this.fsm.setState(State.Normal)
        }).start()
    },
    onNormalEnter() {
        this.schedule(this.crowdGrow, 1 / this.crowd_factor); // 开始增长
        this.scheduleOnce(() => { if (this.fastigium != 0) this.fsm.setState(State.Fastigium) }, 3) // 计划 进入高峰期
    },
    onNormalExit() {
        this.unschedule(this.crowdGrow)
    },
    onVanishEnter() {
        for (let line of this._lines) {
            line.vanishStation(this) // 通知包含该站点的 所有线路
        }
        this._lines.length = 0
        if (this.cur_population >= this.population_limit) { //爆满消失
            this.anim.play("packed_vanish")
        } else { // 正常消失
            this.anim.play("vanish")
        }
    },

    // Animation
    onFinished(type, state) { // animation 回调
        switch (state.name) {
            case "spawning":
                this.fsm.setState(State.Normal)
                break
            case "packing":
                if (this.pend_packed != false)
                    this.fsm.setState(State.Vanish)
                break
            case "vanish":
            case "packed_vanish":
                MetroStation.metro_mng.vanishStation(this); // 站点消去
                this.info.exist = false
                break

        }
    },
    // line交互
    LineWaitExit(line) {
        this._lines.remove(line)
        if (this.fastigium == 0) { // 已经不会再有人流高潮了，将会在该次运输之后消失
            if (this.pend_packed) {
                let state = this.anim.getAnimationState("packing")
                state.repeatCount = 0
            } else {
                this.fsm.setState(State.Vanish)
            }
        }
    },

})