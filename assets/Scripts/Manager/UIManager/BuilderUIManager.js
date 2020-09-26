var Infrastructure = require("Infrastructure")
var MetroBuilderManager = require("MetroBuilderManager")
var infras_base_info = cc.Class({
    name: "infras_base_info",
    // statics: {
    //     grid_index_label_default: null,
    //     infras_size_label_default: null,
    // },
    properties: {
        info_label: {
            type: cc.Label,
            default: null,
        }
    },
    updateUI(infras) {
        var infos = this.info_label.string.split('\n')
        var idx_info = infos[0].split(":")[0] + ":" + infras.idx
        var size_info = infos[1].split(":")[0] + ":" + cc.v2(Math.abs(infras.size.x), Math.abs(infras.size.y))
        this.info_label.string = idx_info + '\n' + size_info

    },
})
var user_info = cc.Class({
    name: "user_info",
    properties: {
        coin_label: {
            type: cc.Label,
            default: null,
        },
    },
    updateUI(player) {
        this.coin_label.string = this.coin_label.string.split(":")[0] + ":" + player.coin
    }
})

var floor_info = cc.Class({
    name: "floor_info",
    properties: {
        floor_label: {
            type: cc.Label,
            default: null,
        },
    },
    updateUI(floor_infras) {
        var infos = this.floor_label.string.split('\n')
        var attraction_info = infos[0].split(":")[0] + ":" + floor_infras.attraction
        var capacity_info = infos[1].split(":")[0] + ":" + floor_infras.getHumanNum() + "/" + floor_infras.capacity
        var human_info = infos[2].split(":")[0] + ":" + Math.floor(floor_infras.getNextHumanRemain()) + "s"
        this.floor_label.string = attraction_info + '\n' + capacity_info + '\n' + human_info
    },
    onSelect() {
        this.floor_label.node.active = true
    },
    onDeSelect() {
        this.floor_label.node.active = false
    }
})

var metro_info = cc.Class({
    name: "metro_info",
    properties: {
        metro_label: {
            type: cc.Label,
            default: null,
        },
    },
    updateUI(metro_infras) {
        var infos = this.metro_label.string.split('\n')
        var speed_info = infos[0].split(":")[0] + ":" + metro_infras.speed
        var capacity_info = infos[1].split(":")[0] + ":" + metro_infras.capacity + "/" + metro_infras.passenger_num
        this.floor_label.string = speed_info + '\n' + capacity_info
    },
    onSelect() {
        this.metro_label.node.active = true
    },
    onDeSelect() {
        this.metro_label.node.active = false
    }
})


var track_info = cc.Class({
    name: "track_info",
    properties: {
        track_label: {
            type: cc.Label,
            default: null,
        },
        depart_btn: {
            type: cc.Button,
            default: null,
        },
        dir_btn: {
            type: cc.Button,
            default: null,
        },
        dir_label: {
            type: cc.Label,
            default: null,
        }

    },
    updateUI(track_infras) {
        var infos = this.track_label.string.split('\n')
        var endurance_info = infos[0].split(":")[0] + ":" + track_infras.endurance + "/" + track_infras.endurance_limit
        this.track_label.string = endurance_info

        let strs = this.dir_label.string.split(":")

        this.dir_label.string = strs[0] + (track_infras.dir ? ":←" : ":→")
    },
    onSelect() {
        this.track_label.node.active = true
        this.depart_btn.node.active = true
        this.dir_btn.node.active = true
    },
    onDeSelect() {
        this.track_label.node.active = false
        this.depart_btn.node.active = false
        this.dir_btn.node.active = false
    },
    trackDirChange(callback) {
        let strs = this.dir_label.string.split(":")
        let dir = strs[1]
        if (dir == "←") {
            callback("→")
        } else if (dir == "→") {
            callback("←")
        }
    }
})

var Miscellanenous = cc.Class({
    name: "Miscellanenous",
    properties: {
        mode_btn: {
            type: cc.Button,
            default: null,
        },
        mode_label: {
            type: cc.Label,
            default: null
        }
    },
    ctor() {},
    changeMode(callback) {
        if (this.mode_label.string == "观察") {
            this.mode_label.string = "建造"
            callback("建造")
        } else if (this.mode_label.string == "建造") {
            this.mode_label.string = "观察"
            callback("观察")
        }

    }
})

cc.Class({
    extends: require("BaseManager"),
    properties: {
        layout: {
            type: cc.Layout,
            default: null,
        },
        infras_panel: { // infras 选择界面
            type: cc.Layout,
            default: null,
        },
        infras_base_info: {
            type: infras_base_info,
            default: null
        },
        floor_info: {
            type: floor_info,
            default: null,
        },
        metro_info: {
            type: metro_info,
            default: null
        },
        track_info: {
            type: track_info,
            default: null,
        },
        miscel: {
            type: Miscellanenous,
            default: null
        },
        infras_panel_elem_prefab: {
            type: cc.Prefab,
            default: null,
        },
        user_info: {
            type: user_info,
            default: null,
        }
    },
    ctor() {
        this.focus = null
    },
    initManager(gameMng) {
        this._super(gameMng)
        this.hideUI()
        this.ui_infos = {}

        this.ui_infos[Infrastructure.InfrasTypes.Floor] = this.floor_info
        this.ui_infos[Infrastructure.InfrasTypes.Track] = this.track_info
        this.ui_infos[Infrastructure.InfrasTypes.Metro] = this.metro_info
        for (const key in this.ui_infos) {
            const element = this.ui_infos[key];
            element.onDeSelect()
        }
        this._initInfrasPanel()
        this._initMiscel()
    },

    update(dt) {
        this.user_info.updateUI(this.gameMng.playerMng)
        if (this.focus != null) {
            this._updateUI()
        }
    },
    setFocus(infras) {
        if (this.focus == null) {
            this.showUI()
        }
        if (infras == null) {
            this.hideUI()
        }
        this._onFocucsChange(this.focus, infras)
        this.focus = infras
        switch (this.focus) {
            case Infrastructure.Floor:
                this.floor_info.onSelect()
                break;
        }
    },

    onModeChange(mode) {
        let BuildMode = MetroBuilderManager.BuildMode
        switch (mode) {
            case BuildMode.Build:
                this.infras_panel.node.active = true
                break;
            case BuildMode.View:
                this.infras_panel.node.active = false
                break;
            case BuildMode.Stretch:
                this.infras_panel.node.active = false
                break;
        }
    },

    hideUI() {
        this.layout.node.active = false
    },
    showUI() {
        this.layout.node.active = true
    },
    _updateUI() {

        this.infras_base_info.updateUI(this.focus)
        this.ui_infos[this.focus.type].updateUI(this.focus)
        this.layout.updateLayout()
    },
    _onFocucsChange(cur_infras, next_infras) {
        if (cur_infras == null && next_infras == null) return
        if (cur_infras != null)
            this.ui_infos[cur_infras.type].onDeSelect()
        if (next_infras != null)
            this.ui_infos[next_infras.type].onSelect()
    },
    _initInfrasPanel() {
        let metroBuilderMng = this.gameMng.metroBuilderMng
        let infras_list = metroBuilderMng.elem_list
        for (let i = 0; i < infras_list.length; i++) {
            const infras = infras_list[i];
            let elem = cc.instantiate(this.infras_panel_elem_prefab)
            elem.setParent(this.infras_panel.node)
            let icon = elem.children[0].getChildByName("Infras_Icon").getComponent(cc.Sprite)
            icon.spriteFrame = infras.data.getComponent("Infrastructure").icon
            let btn = elem.getComponent(cc.Button)
            elem.getComponentInChildren(cc.Label).string = infras.name
            var clickEventHandler = new cc.Component.EventHandler();
            clickEventHandler.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
            clickEventHandler.component = "BuilderUIManager"; // 这个是代码文件名
            clickEventHandler.handler = "selectInfrasPrefab";
            clickEventHandler.customEventData = i;
            btn.clickEvents.push(clickEventHandler);
        }
    },
    _initMiscel() {
        if (this.miscel.mode_label.string == "建造") {
            this.gameMng.metroBuilderMng.mode = MetroBuilderManager.BuildMode.View
        } else if (this.miscel.mode_label.string == "观察") {
            this.gameMng.metroBuilderMng.mode = MetroBuilderManager.BuildMode.Build
        }

    },

    //btn event
    changeMode() {
        this.miscel.changeMode((mode_string) => {
            if (mode_string == "观察")
                this.gameMng.metroBuilderMng.mode = MetroBuilderManager.BuildMode.Build
            else if (mode_string == "建造")
                this.gameMng.metroBuilderMng.mode = MetroBuilderManager.BuildMode.View
        })
    },
    selectInfrasPrefab(evnet, list_idx) {
        this.gameMng.metroBuilderMng.selectInfrasPrefab(list_idx)
    },
    trackDirChange() {
        this.focus.dir = !this.focus.dir
    },
    onDepart() {
        this.focus.onDepart()
    },
    onBackPress() {
        cc.director.loadScene("Main");
    }

})