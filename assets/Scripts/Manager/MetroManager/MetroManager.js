//总管 所有的 地铁站 包括其生成，布局 等等
// 需要保持有 一个 node pool

const stations = [{
    city: "无锡",
    lines: [{
            line_id: 0,
            line_name: "一号线",
            line_sta: [
                "堰桥",
                "锡北运河",
                "西漳",
                "天一",
                "刘潭",
                "庄前",
                "民丰",
                "无锡火车站",
            ]
        },
        {
            line_id: 1,
            line_name: "二号线",
            line_sta: [
                "胜利门",
                "三阳广场",
                "南禅寺",
                "谈渡桥",
                "太湖广场",
                "清名桥",
                "人民医院",
                "华清大桥",
                "扬名",
            ]
        },
        {
            line_id: 2,
            line_name: "三号线",
            line_sta: [
                "南湖家园",
                "塘铁桥",
                "金匮公园",
                "市民中心",
                "文化宫",
                "江南大学",
                "长广溪",
                "梅园开原寺",
                "荣巷",
                "小桃源",
            ]
        },
    ]
}]

var MetroLine = require("MetroLine")
var MetroStation = require("MetroStation")
var Metro = cc.Class({
    extends: require("BaseManager"),
    properties: {
        layoutx: {
            default: 10,
            type: cc.Integer,
        },
        layouty: {
            default: 10,
            type: cc.Integer,
        },
        station_prefab: {
            default: null,
            type: cc.Prefab,
        },
        line_prefab: {
            default: null,
            type: cc.Prefab,
        },
        exit_prefab: {
            default: null,
            type: cc.Prefab,
        }
    },
    ctor() {
        this.cur_line = null // 当前正在构建的 路线
        this.former_entity = null // 之前touch 的 station
    },
    start() {
        this.station_root = this.node.getChildByName("Stations")
        this.line_root = this.node.getChildByName("Lines")
        MetroLine.metro_mng = this;
        MetroStation.metro_mng = this; // 设置 管理员
        Metro.station_size = this.station_prefab.data.getContentSize().width; // 初始化 station 的 size


    },

    // LIFE-CYCLE CALLBACKS:

    //onLoad () {},

    initManager(gameMng) {
        this._super(gameMng)
            // 对象池初始化
        this._initPools();
        // 布局初始化
        this._initCells();
        // 事件监听
        this._initEvents();
        // 初始化出口


        //TEST 绘制 grid
        let graphic = this.node.getComponent(cc.Graphics);
        for (let i = 0; i < this.layouty; i++) {
            graphic.moveTo(0, i * this.cellheight)
            graphic.lineTo(this.width, i * this.cellheight)
        }
        for (let i = 0; i < this.layoutx; i++) {
            graphic.moveTo(i * this.cellwidth, 0)
            graphic.lineTo(i * this.cellwidth, this.height)
        }
        graphic.stroke();

        for (let i = 0; i < 10; i++)
            this.randomGenStation();

        let cellindex = this._randomGetFreeCell()
        this.genExit(cellindex[0], cellindex[1])

    },
    //事件 及 回调函数
    _initEvents() {
        this.gameMng.listenToInput("touch_start", this.onTouchStart, this)
        this.gameMng.listenToInput("on_touch", this.onTouch, this)
        this.gameMng.listenToInput("touch_end", this.onTouchEnd, this)
        this.gameMng.listenToInput("touch_cancle", this.onTouchEnd, this)
    },


    onTouchStart(event) {
        var line = this.genLine();
        var pos = event.getLocation();
        var cellindex = this.getCellIndex(pos);
        if (cellindex == null) throw "Line 输入不在范围内"
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        this.onTouchEntity(entity, line, pos)

    },
    onTouch(event) {
        var line = this.cur_line
        var pos = event.getLocation();
        var cellindex = this.getCellIndex(pos);
        if (cellindex == null) throw "Line 输入不在范围内"
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        this.onTouchEntity(entity, line, pos)
    },
    onTouchEnd(event) {
        ///this.cur_line //TODO something
        this.cur_line.buildOver();
        this.cur_line = null
    },
    onTouchEntity(entity, line, pos) { // 分别通知 line  和 station 当前触碰到了一个 station
        let entity_touchend = true
        let former_entity = this.former_entity
        this.former_entity = null
        if (entity != null) {
            if (entity.isIn(pos)) {
                if (entity != former_entity) { // 不是同一个 加入到  站点中
                    entity.onTouch();
                    if (line.addStation(entity)) { // 被成功添加了（该line 中不存在该站点）
                        entity.onAdded(line) // 触发station 的  onAdded函数 告知其被加入了
                    }
                } else {
                    entity_touchend = false
                }
                this.former_entity = entity

            } //TODO not in pos else
        }
        if (entity_touchend && former_entity != null) {
            former_entity.onTouchEnd()
        }
        line.build(pos);
    },
    // onTouchCancle(event) {

    // },



    //对象池
    _initPools() {
        this.station_pool = new cc.NodePool("MetroStation") // station对象池
        this.line_pool = new cc.NodePool("MetroLine") // Line 对象池
        this.exit_pool = new cc.NodePool("MetroExit")

        for (let i = 0; i < Metro.station_pool_size; i++) {
            var station = cc.instantiate(this.station_prefab);
            this.station_pool.put(station);
        }

        for (let i = 0; i < Metro.line_pool_size; i++) { //最大站点数 需要再定
            let line = cc.instantiate(this.line_prefab);
            this.line_pool.put(line)
        }

        for (let i = 0; i < Metro.exit_pool_size; i++) {
            let exit = cc.instantiate(this.exit_prefab)
            this.exit_pool.put(exit)
        }
    },
    // 地铁网格布局
    _initCells() { // 初始化 所有的单元格
        var size = this.node.getContentSize();
        this.width = size.width;
        this.height = size.height;
        this.cellwidth = size.width / this.layoutx;
        this.cellheight = size.height / this.layouty;
        // 生成 0x *****11111 1 表示有效位置 0x1 >>> 0 表示 生成无符号整数 便于 调试
        // able_mask 用于快速检查 是否有空位
        this.row_able_mask = ((0x1 >>> 0) << (this.layouty + 1)) - 1
        this.col_able_mask = ((0x1 >>> 0) << (this.layoutx + 1)) - 1
            // 位为1 代表可用
        this.cell_masks = { // 代表当前的 cell 使用情况的 mask
                row_mask: 0xffffffff, // 主行数组
                col_mask: []
            } // 存储 各个cell  cell为对应的 station
        this.cells = [] // 用于存储 场景中的 所有的station 的信息 使用分区模式，这样可以快速获得毗邻信息

        for (let i = 0; i < this.layoutx; i++) {
            this.cell_masks.col_mask.push(0xffffffff);
        }
        for (let i = 0; i < this.layoutx; i++) {
            let row = []
            let x = i * this.cellwidth + 0.5 * this.cellwidth;
            for (let j = 0; j < this.layoutx; j++) {
                row.push({ // x, y 指代的是中间位置
                    x: x,
                    y: j * this.cellheight + 0.5 * this.cellheight,
                    entity: null,
                })
            }
            this.cells.push(row)
        }
    },
    getCellIndex(pos) { // 通过 坐标 posx posy 来获取到 cellindex
        pos = this.node.convertToNodeSpaceAR(pos) // 转换到局部坐标
        let x = Math.floor(pos.x / this.cellwidth)
        let y = Math.floor(pos.y / this.cellheight)
        if (this._isValid(x, y))
            return [x, y]
        else
            return null // 没有不在范围内 
    },
    _randomGetFreeCell() { //随机获取一个空白位置
        let rowbits = this.row_able_mask & this.cell_masks.row_mask
        if (rowbits == 0) { // 无空位
            return null;
        }
        let randy = Math.floor(Math.random() * this.layouty);
        let celly = randy
        while ((rowbits & (0x1 << celly)) == 0) {
            celly--;
            if (celly == -1 && randy != this.layouty - 1) {
                celly = this.layouty - 1;
            }
        }
        let randx = Math.floor(Math.random() * this.layoutx)
        let cellx = randx
        while ((this.cell_masks.col_mask[celly] & (0x1 << cellx)) == 0) {
            cellx--;
            if (cellx == -1 && randx != this.layoutx - 1) {
                cellx = this.layoutx - 1;
            }
        }
        return [cellx, celly] //  返回一个
    },
    isFree(x, y) {
        return this.cells[x][y].entity == null;
    },
    getAdjancents(pos) {
        let cellindex = this.getCellIndex(pos)
        let entity = this.cells[cellindex[0]][cellindex[1]].entity
        if (entity != null && entity.isIn(pos)) { // 如果终点在 某个实体内 则直接将全部的乘客送到该站内即可
            return entity
        }
        let entities = []
        for (let i = -1; i <= 1; i++) { // 检查周边的九宫格  
            let x = cellindex[0] + i
            for (let j = -1; j <= 1; j++) {
                let y = cellindex[1] + j
                if (this._isValid(x, y) && !this.isFree(x, y)) {
                    entities.push(this.cells[x][y].entity)
                }
            }
        }
        return entities
    },
    _isValid(cellindex_or_x, y) { // 检查
        if (y != null) {
            var x = cellindex_or_x
        } else {
            var x = cellindex_or_x[0]
            y = cellindex_or_x[1]
        }
        return ((x >= 0 && x < this.cells[0].length) && (y < this.cells.length && y >= 0))
    },


    // Entity 生成
    randomGenStation() { // 随机生成一个 站点 并将其 放入到 cells 数组进行监视        
        let cellindex = this._randomGetFreeCell()
        if (cellindex == null) throw "没有空余空间"; //生成失败
        this.genStation(cellindex[0], cellindex[1])
    },
    genStation(x, y) { // 生成站点
        if (this.isFree(x, y) == false) throw "已有站点"
            //TODO 解决超过池上限

        if (this.station_pool.size == 0) throw "对象池没有空余"; // 没有空位


        let stationRadius = Metro.station_size;
        let maxRadius = Math.min(this.cellheight, this.cellwidth);
        let scale = (0.5 + Math.random() * 0.5) * maxRadius / stationRadius;
        let scaledRadius = stationRadius * scale;
        let xrange = (this.cellwidth - scaledRadius) / 2;
        let yrange = (this.cellheight - scaledRadius) / 2;
        var station = this.station_pool.get(100, 1 + Math.random() * 4, '北京站', cc.Color.BLUE, [x, y], scale);
        let cell = this.cells[x][y]
        cell.entity = station.getComponent("MetroStation");
        station.setScale(scale, scale)
        station.setPosition(cell.x + (xrange * (1 - 2 * Math.random())), cell.y + (yrange * (1 - 2 * Math.random())));
        station.setParent(this.station_root);

        //this.cell_masks.row_mask &= ~(1 << y)
        this.cell_masks.col_mask[y] &= ~(1 << x)
        if (this.cell_masks.col_mask[y] & this.col_able_mask == 0) {
            this.cell_masks.row_mask &= ~(1 << y)
        }
    },
    vanishStation(station) {
        this.station_pool.put(station.node)
        station.node.targetOff(this)
        let x = station.cellindex[0]
        let y = station.cellindex[1]
        if (this.cell_masks.col_mask[y] & this.col_able_mask == 0) {
            this.cell_masks.row_mask |= (1 << y)
        }
        this.cell_masks.col_mask[y] |= (1 << x)
        this.cells[x][y].entity = null
    },
    genExit(x, y) { //生成出口站
        if (this.isFree(x, y) == false) throw "已有实体"
            //TODO 解决超过池上限

        if (this.exit_pool.size == 0) throw "出口对象池没有空余"; // 没有空位
        let stationRadius = Metro.station_size;
        let maxRadius = Math.min(this.cellheight, this.cellwidth);
        let scale = (0.5 + Math.random() * 0.5) * maxRadius / stationRadius;
        let scaledRadius = stationRadius * scale;
        let xrange = (this.cellwidth - scaledRadius) / 2;
        let yrange = (this.cellheight - scaledRadius) / 2;

        var exit = this.exit_pool.get([x, y], scale);

        let cell = this.cells[x][y]
        cell.entity = exit.getComponent("MetroExit");
        exit.setScale(scale, scale)
        exit.setPosition(cell.x + (xrange * (1 - 2 * Math.random())), cell.y + (yrange * (1 - 2 * Math.random())));
        exit.setParent(this.station_root);

        //this.cell_masks.row_mask &= ~(1 << y)
        this.cell_masks.col_mask[y] &= ~(1 << x)
        if (this.cell_masks.col_mask[y] & this.col_able_mask == 0) {
            this.cell_masks.row_mask &= ~(1 << y)
        }

    },



    //Line 生成
    genLine() {
        var line = this.line_pool.get(1, 100);
        if (line == null) throw "超过路线上限";
        line.setParent(this.line_root)
        line = line.getComponent("MetroLine")
        this.cur_line = line
        return line

    },
    fadeLine(line) { // Line消去
        //let cellindex = this.getCellIndex(line.car_pos)
        this.line_pool.put(line.node)
    },

})