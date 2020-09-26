function ByProgress(target, field_name, callback, callback_arg) {
    let added = 0
    let acc_delta = 0
    this.tween = null
    var that = this
    this.progress = (start, end, current, t) => { // 由于 population 是整数 所以 只在delta 为整数的 时候更新
        let new_added = (end - start) * t
        let delta = new_added - added
        acc_delta += delta
        added = new_added
        if (Math.abs(acc_delta) >= 1) {
            try {
                delta = callback(that.tween, Math.floor(acc_delta), callback_arg)
            } catch (error) {
                return;
            }
            acc_delta = acc_delta - delta
        } else {
            delta = 0
        }
        if (t == 1) { // its finished
            target.removeTween(that.tween)
        }
        if (callback_arg != null)
            callback_arg.wait_pop_delta += delta
        return target[field_name] + delta
    }
}

var MetroEntity = cc.Class({
    extends: cc.Component,
    properties: {
        cur_population: {
            type: cc.Integer,
            get() {
                return this._cur_pop
            },
            set(value) {
                this._cur_pop = value
            }
        }
    },
    statics: {
        EntityType: {
            EXIT: 0,
            STATION: 1,
        },
        MetroMng: null,
    },
    ctor() {
        this.entity_type = MetroEntity.EntityType.STATION // entity 类型
        this.cellindex = [] // 在 cell 网格 中的位置
        this.default_scale = null
        this._lines = [] // 该站点当前归属的 线路
        this.wait_time = 0.5 // line 在此处等待处理的时间
        this._cur_pop = 0 // 该位置总共收纳的 人数
        this._tweens = [] // 保存 当前在执行的 tweens
    },
    init() {
        this.anim = this.getComponent(cc.Animation)
        this.anim.on(cc.Animation.EventType.PLAY, this.onPlay, this)
        this.anim.on(cc.Animation.EventType.STOP, this.onStop, this)
        this.anim.on(cc.Animation.EventType.FINISHED, this.onFinished, this)
    },
    //私有方法
    _clearTweens() {
        this._tweens.forEach(element => {
            element.stop() // 停止所有的tween
            element._actions.shift() // 使用 shift 来保证 接下来的 动作也会执行
            element.start()
        });
        this._tweens.length = 0
    },
    removeTween(tween) {
        if(this._tweens == null) return
        this._tweens.remove(tween)
    },
    // MetroManager 调用接口
    /// 动作
    onTouch() {},
    onTouchEnd() {},
    onAdded(line) { // 被加入到 路线中
        if (this._lines.indexOf(line) != -1) { //已存在
            return false;
        }
        this._lines.push(line)
    },
    /// 状态
    isIn(pos) { // 判断 对应的 点的位置 是否在该station 的范围内
        var bounding_rect = this.node.getBoundingBoxToWorld()
        return bounding_rect.contains(pos);
    },


    // 对象池函数
    unuse: function() {
        this.node.active = false;
        this._clearTweens()
    },
    reuse: function(cellindex, scale) { // 重用函数  
        
        this.node.active = true;
        this.cellindex = cellindex;
        this.default_scale = cc.v2(scale, scale);
    },
    getWaitNumber(line) {}, // 获取 该线到达该站的时候 需要进行的人数变化
    onPopUpdate(tween, delta, line) {
        if (line != null)
            delta = line.updatePop(-delta) // 线路的增加量为 相反数

    }, // 在 人流从 外部涌入的时 每帧调用的函数
    crowdIn(number, time, line) { //  人群从外部涌入 在 time 秒内 涌入 number 数量的人
        // 返回的是 tween 对象 以来帮助建立 动作序列
        let progress = new ByProgress(this, "cur_population", this.onPopUpdate.bind(this), line)
        let tween = cc.tween(this).by(time, {
            cur_population: {
                value: number,
                progress: progress.progress
            }
        })
        progress.tween = tween
        this._tweens.push(tween)
        return tween
    },
    wait(line) {
        let progress = new ByProgress(this, "cur_population", this.onPopUpdate.bind(this), line)
        let number = this.getWaitNumber(line)
        let tween = cc.tween(this).by(this.wait_time, {
            cur_population: {
                value: number,
                progress: progress.progress
            }
        })
        progress.tween = tween
        this._tweens.push(tween)
        return tween
    },
    // animation 回调
    onPlay(type, state) { // animation 回调

    },
    onStop(type, state) {

    },
    onFinished(type, state) {

    }


})