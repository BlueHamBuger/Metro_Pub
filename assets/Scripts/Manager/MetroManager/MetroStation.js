var FSM = require("StateMachine")
var State = window.GB_StationState = {
    Normal: 0,
    Fastigium: 1,
    Vanish: 2,
}
var MetroStation = cc.Class({
    extends: require("MetroEntity"),
    statics: {
        StateFunc: FSM.genFuncs(State)
    },
    properties: {
        //组件
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
                this._cur_pop = value;
                this.particles.totalParticles = this._cur_pop
                    //cc.ParticleSystem.prototype.
                if (this.cur_population >= this.population_limit && !this.packed) {
                    this.packed = true
                } else if (this.packed) {
                    let rate = (this.cur_population - this.population_limit) / this.population_limit
                    if (rate >= MetroStation.vanish_rate) {
                        this.fsm.setState(State.Vanish)
                    }
                }
                this.population_text.string = this.cur_population + "\\" + this.population_limit;
            }
        },
        crowd_factor: 1, // 增长速率  应该和**挂钩
        station_name: {
            get() {
                return this.name_text.string;
            },
            set(value) {
                this.name_text.string = value;
            }
        },
        station_id: {
            default: 0,
            type: cc.Integer
        },
        color: {
            get() {
                return this.station_sprite.node.color;
            },
            set(value) {
                this.station_sprite.node.color = value;
            },
        },
        // 状态
        packed: {
            get() {
                return this._packed
            },
            set(value) {
                if (value == this._packed)
                    return
                else if (value == false) {

                } else if (value == true) { // 播放动画等等

                }
                this._packed = value
            }
        },
        particles: {
            default: null,
            type: cc.ParticleSystem
        },
    },
    ctor() {
        this._packed = false
        this.fsm = new FSM(MetroStation.StateFunc, this)
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
        this.population_limit = station_info.population_limit
        this.crowd_factor = station_info.crowdFactor;
        this.station_name = station_info.info.station_name;
        this.station_id = station_info.info.station_id
        this.info = station_info.info // info 对应的是车站的真实数据
        this.info.exist = true
        this.info.for_cell = cellindex
        this.color = station_info.city.color; //TODO color 的设置细化
        this.station_sprite.getComponent(cc.Sprite).spriteFrame = station_info.city.tex
        this.fastigium = station_info.fastigium //高峰期次数
        this.fastigium_pop = station_info.fastigium_pop
        this.fastigium_inverval = station_info.fastigium_inverval
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
        var bounding_rect = this.station_sprite.node.getBoundingBoxToWorld()
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
        this.unschedule(this.crowdGrow)
        this.crowdIn(this.fastigium_pop, 2).call(() => { //高峰期持续 2s
            this.fastigium--;
            if (this.fastigium == 0) { //station 生命周期结束
                this.fsm.setState(State.Vanish) // 生命周期结束 正常消失
            } else {
                this.fsm.setState(State.Normal)
            }
        }).start()
    },
    onNormalEnter() {
        this.schedule(this.crowdGrow, 1 / this.crowd_factor); // 开始增长
        this.scheduleOnce(() => { this.fsm.setState(State.Fastigium) }, 3) // 计划 进入高峰期
    },
    onVanishEnter() {
        if (this.packed) { //爆满消失
            this.vanish()
        } else { // 正常消失
            this.vanish()
        }
    },



    // Animation
    onFinished(type, state) { // animation 回调
        switch (state.name) {
            case "spawning":
                this.fsm.setState(State.Normal)
                break
        }
    },

})