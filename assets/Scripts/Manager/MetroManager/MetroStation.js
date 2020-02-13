var MetroStation = cc.Class({
    extends: require("MetroEntity"),
    properties: {
        //nodes
        name_text: {
            default: null,
            type: cc.Label,
        },
        population_text: {
            default: null,
            type: cc.Label,
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
                        this.vanish()
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
        color: {
            get() {
                return this.node.color;
            },
            set(value) {
                this.node.color = value;
            },
        },
        // 状态
        packed: false,
        particles: {
            default: null,
            type: cc.ParticleSystem
        }
    },
    ctor() {},
    onLoad() {

    },
    unuse: function() {
        this._super()
        this.unschedule(this.crowdGrow, this);
    },

    reuse: function(limit, crowdFactor, name, color, cellindex, scale) { // 重用函数  
        this._super(cellindex, scale)
        this.population_limit = limit;
        this.crowd_factor = crowdFactor;
        this.station_name = name;
        this.color = color;
        this.cur_population = 0;
        this.schedule(this.crowdGrow, 1 / this.crowd_factor);
        this.crowdIn(20, 2).start()
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
        var bounding_rect = this.node.getBoundingBoxToWorld()
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
        for (let line of this._lines) {
            line.vanishStation(this) // 通知包含该站点的 所有线路
        }
    },
    crowdGrow() { // 人群自然增长 通过 schedule 方法来 定期调用，调用的间隔由   crowd_factor来决定
        this.cur_population++;
    },
})