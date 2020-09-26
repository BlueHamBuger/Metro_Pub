var Prefab_Types = cc.Enum({
    Human: "human"
})
Window.Builder_Prefab_Types = Prefab_Types

// var PrefabDatas = cc.Class({
//     name: "PrefabDatas",
//     properties: {
//         type: Prefab_Types,
//         datas: {
//             type: [cc.Prefab],
//             get() {

//             },
//             set(value) {

//             }
//         }
//     },
//     ctor() {
//         this.datas = {}
//         var a = {}
//         a.
//     }
// })

var MaterialsData = cc.Class({
    name: "MaterialsData",
    properties: {
        infras_norm: {
            type: cc.Material,
            default: null,
        },
        infras_select: {
            type: cc.Material,
            default: null,
        },
        infras_block: {
            type: cc.Material,
            default: null,
        },
    }
})




cc.Class({
    extends: require("BaseManager"),
    properties: { //静态 资源将直接 分配在  properties中
        Materials: {
            type: MaterialsData,
            default: null,
        },
        HumanPrefabs: {
            type: [cc.Prefab],
            default: [],
        }
    },
    initManager(gameMng) {
        this._super(gameMng)
        console.log(this.HumanPrefabs[0].name);
    },
    getMaterial(name) {
        return this.Materials[name]
    },
    getPrefab(type, name) {
        switch (type) {
            case Prefab_Types.Human:
                return this._getPrefabByName(name, this.HumanPrefabs)
        }
    },
    getRandomPrefab(type) {
        var prefabs;
        var r = Math.random()
        switch (type) {
            case Prefab_Types.Human:
                prefabs = this.HumanPrefabs
                return prefabs[Math.floor(r * prefabs.length)]
        }
    },
    _getPrefabByName(name, prefabs) {
        for (let i = 0; i < prefabs.length; i++) {
            const p = prefabs[i];
            if (p.name == name) {
                return p
            }
        }
    }


})