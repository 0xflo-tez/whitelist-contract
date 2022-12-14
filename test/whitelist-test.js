const {
    deploy,
    getAccount,
    setQuiet,
    expectToThrow,
    getValueFromBigMap,
    exprMichelineToJson,
    setEndpoint
} = require('@completium/completium-cli');

const {
    errors
} = require('./utils');

const assert = require('assert');

setQuiet("true");

const mockup_mode = true;

setEndpoint(mockup_mode ? 'mockup' : 'https://hangzhounet.smartpy.io');

// contracts
let users;
let whitelist;

// accounts
const super_user = getAccount(mockup_mode ? 'alice' : "alice");
const whitelister = getAccount(mockup_mode ? 'bob' : "bob");
const carl = getAccount(mockup_mode ? 'carl' : "carl");
const daniel = getAccount(mockup_mode ? 'daniel' : "daniel");
const eddy = getAccount(mockup_mode ? 'eddy' : "eddy");
const list0_user1 = getAccount(mockup_mode ? 'flo' : "flo");
const list0_user2 = getAccount(mockup_mode ? 'gary' : "gary");
const list1_user1 = getAccount(mockup_mode ? 'hugo' : "hugo");
const list1_user2 = getAccount(mockup_mode ? 'ian' : "ian");
const list2_user1 = getAccount(mockup_mode ? 'jacky' : "jacky");
const kevin = getAccount(mockup_mode ? 'kevin' : "kevin");

describe("Deploy & init", async () => {
    it("Deploy Users Storage", async () => {
        [users, _] = await deploy('./contract/users_storage.arl', {
            parameters: {
                admin: whitelister.pkh,
            }
        })
    });
    it("Deploy Whitelist", async () => {
        [whitelist, _] = await deploy('./contract/whitelist.arl', {
            parameters: {
                admin: whitelister.pkh,
                users: users.address
            },
            as: whitelister.pkh
        });
    });
    it("Set Users Accessor", async () => {
        await users.add_whitelister({
            arg : {
                new_whitelister : whitelist.address
            },
            as : whitelister.pkh
        })
    })
});


describe("Set admin", async () => {
    it("Set admin as non admin should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.declare_admin({
                arg: {
                    value: whitelister.pkh
                },
                as: carl.pkh
            });
        }, errors.INVALID_CALLER)
    });

    it("Set admin should succeed", async () => {
        await whitelist.declare_admin({
            arg: {
                value: whitelister.pkh
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage()
        assert(storage.admin === whitelister.pkh)
    });
});

describe("Add super user", async () => {
    it("Add super user in whitelist contract as non admin should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.add_super_user({
                arg: {
                    user: super_user.pkh,
                },
                as: carl.pkh
            });
        }, errors.INVALID_CALLER)
    });

    it("Add super user in whitelist contract as admin should succeed", async () => {
        await whitelist.add_super_user({
            arg: {
                user: super_user.pkh,
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage()
        assert(storage.super_users.includes(super_user.pkh))
    });

    it("Add an already existing super user in whitelist contract as admin should succeed", async () => {
        await whitelist.add_super_user({
            arg: {
                user: super_user.pkh,
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage()
        assert(storage.super_users.includes(super_user.pkh))
    });
});

describe("Update user", async () => {
    it("Update a non existing user in whitelist contract as non admin should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.update_user({
                arg: {
                    user: list0_user1.pkh,
                    transfer_list_id: 0
                },
                as: carl.pkh
            });
        }, errors.INVALID_CALLER)
    });

    it("Update a non existing user in whitelist contract as admin should succeed", async () => {
        await whitelist.update_user({
            arg: {
                user: list0_user1.pkh,
                transfer_list_id: 0
            },
            as: whitelister.pkh
        });
        const storage = await users.getStorage();
        var user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list0_user1.pkh}"`), exprMichelineToJson(`address'`));
        assert(user.int === "0")
    });

    it("Update a non existing user in whitelist contract with no whitelist id as admin should succeed", async () => {
        await whitelist.update_user({
            arg: {
                user: list0_user2.pkh,
                transfer_list_id: null
            },
            as: whitelister.pkh
        });
        const storage = await users.getStorage();
        var user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list0_user2.pkh}"`), exprMichelineToJson(`address'`));
        assert(user === null)
    });

    it("Update an existing user in whitelist contract with whitelist id as admin should succeed", async () => {
        await whitelist.update_user({
            arg: {
                user: list0_user2.pkh,
                transfer_list_id: 0
            },
            as: whitelister.pkh
        });
        const storage = await users.getStorage();
        var user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list0_user2.pkh}"`), exprMichelineToJson(`address'`));
        assert(user.int === "0")
    });

    it("Update an existing user in whitelist contract with no whitelist id (to delete it) as admin should succeed", async () => {
        await whitelist.update_user({
            arg: {
                user: kevin.pkh,
                transfer_list_id: 0
            },
            as: whitelister.pkh
        });
        var storage = await users.getStorage();
        var user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${kevin.pkh}"`), exprMichelineToJson(`address'`));
        assert(user.int === "0")
        await whitelist.update_user({
            arg: {
                user: kevin.pkh,
                transfer_list_id: null
            },
            as: whitelister.pkh
        });
        storagePostUpdate = await users.getStorage();
        user = await getValueFromBigMap(parseInt(storagePostUpdate.users), exprMichelineToJson(`"${kevin.pkh}"`), exprMichelineToJson(`address'`));
        assert(user === null)
    });
});

describe("Update users", async () => {

    it("Update non existing users in whitelist contract as non admin should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.update_users({
                arg: {
                    utl: [[list1_user1.pkh, 1], [list1_user2.pkh, null]]
                },
                as: carl.pkh
            });
        }, errors.INVALID_CALLER)
    });

    it("Update non existing users in whitelist contract as admin should succeed", async () => {
        await whitelist.update_users({
            arg: {
                utl: [[list1_user1.pkh, 0], [list1_user2.pkh, null]]
            },
            as: whitelister.pkh
        });

        const storage = await users.getStorage();
        var user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list1_user1.pkh}"`), exprMichelineToJson(`address'`));
        assert(user.int === "0")
        user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list1_user2.pkh}"`), exprMichelineToJson(`address'`));
        assert(user === null)
    });

    it("Update existing users in whitelist contract as admin should succeed", async () => {
        await whitelist.update_users({
            arg: {
                utl: [[list1_user1.pkh, 1], [list1_user2.pkh, 1]]
            },
            as: whitelister.pkh
        });
        const storage = await users.getStorage();
        var user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list1_user1.pkh}"`), exprMichelineToJson(`address'`));
        assert(user.int === "1")
        user = await getValueFromBigMap(parseInt(storage.users), exprMichelineToJson(`"${list1_user2.pkh}"`), exprMichelineToJson(`address'`));
        assert(user.int === "1")
    });
});

describe("Update transfer list", async () => {
    it("Update non existing transfer list as non admin should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.update_transfer_list({
                arg: {
                    transfer_list_id: 0,
                    u: [true, [0]]
                },
                as: carl.pkh
            });
        }, errors.INVALID_CALLER)
    });

    it("Update non existing transfer list as admin should succeed", async () => {
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 0,
                u: [false, [0, 2, 3]]
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage();
        var list = await getValueFromBigMap(parseInt(storage.transfer_lists), exprMichelineToJson(`0`), exprMichelineToJson(`nat'`));
        assert(list.prim === "Pair"
            && list.args.length === 2
            && list.args[0].prim === "False"
            && list.args[1].length === 3
            && list.args[1][0].int === "0"
            && list.args[1][1].int === "2"
            && list.args[1][2].int === "3"
        )
    });

    it("Update non existing transfer list as admin with no allowed lists should succeed", async () => {
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 1,
                u: [true, []]
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage();
        var list = await getValueFromBigMap(parseInt(storage.transfer_lists), exprMichelineToJson(`1`), exprMichelineToJson(`nat'`));
        assert(list.prim === "Pair"
            && list.args.length === 2
            && list.args[0].prim === "True"
            && list.args[1].length === 0
        )
    });

    it("Update existing transfer list as admin with no allowed lists should succeed", async () => {
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 0,
                u: [true, []]
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage();
        var list = await getValueFromBigMap(parseInt(storage.transfer_lists), exprMichelineToJson(`0`), exprMichelineToJson(`nat'`));
        assert(list.prim === "Pair"
            && list.args.length === 2
            && list.args[0].prim === "True"
            && list.args[1].length === 0
        )
    });

    it("Update existing transfer list as admin should succeed", async () => {
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 1,
                u: [true, [0]]
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage();
        var list = await getValueFromBigMap(parseInt(storage.transfer_lists), exprMichelineToJson(`1`), exprMichelineToJson(`nat'`));
        assert(list.prim === "Pair"
            && list.args.length === 2
            && list.args[0].prim === "True"
            && list.args[1].length === 1
            && list.args[1][0].int === "0"

        )
    });

    it("Update existing transfer list with null to delete it as admin should succeed", async () => {
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 3,
                u: [true, [0]]
            },
            as: whitelister.pkh
        });
        const storage = await whitelist.getStorage();
        var list = await getValueFromBigMap(parseInt(storage.transfer_lists), exprMichelineToJson(`3`), exprMichelineToJson(`nat'`));
        assert(list.prim === "Pair"
            && list.args.length === 2
            && list.args[0].prim === "True"
            && list.args[1].length === 1
            && list.args[1][0].int === "0"
        )
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 3,
                u: null
            },
            as: whitelister.pkh
        });
        const storage2 = await whitelist.getStorage();
        list = await getValueFromBigMap(parseInt(storage2.transfer_lists), exprMichelineToJson(`3`), exprMichelineToJson(`nat'`));
        assert(list === null)
    });
});

describe("Remove super user", async () => {

    it("Remove super user in whitelist contract as non admin should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.remove_super_user({
                arg: {
                    user: super_user.pkh,
                },
                as: carl.pkh
            });
        }, errors.INVALID_CALLER)
    });

    it("Remove non existing super user from whitelist contract should succeed", async () => {
        const storage = await whitelist.getStorage()
        assert(!storage.super_users.includes(carl.pkh))
        await whitelist.remove_super_user({
            arg: {
                user: carl.pkh,
            },
            as: whitelister.pkh
        });
        const storage2 = await whitelist.getStorage()
        assert(!storage2.super_users.includes(carl.pkh))
    });

    it("Remove existing super user from whitelist contract should succeed", async () => {
        const storage = await whitelist.getStorage()
        assert(storage.super_users.includes(super_user.pkh))
        await whitelist.remove_super_user({
            arg: {
                user: super_user.pkh,
            },
            as: whitelister.pkh
        });
        const storage2 = await whitelist.getStorage()
        assert(!storage2.super_users.includes(super_user.pkh))
        await whitelist.add_super_user({
            arg: {
                user: super_user.pkh,
            },
            as: whitelister.pkh
        });
    });
});

describe("Assert receivers", async () => {
    it("Set up users for assert receivers tests", async () => {
        await whitelist.update_transfer_list({
            arg: {
                transfer_list_id: 2,
                u: [false, []]
            },
            as: whitelister.pkh
        });
        await whitelist.update_users({
            arg: {
                utl: [[list2_user1.pkh, 2], [carl.pkh, 2], [list1_user1.pkh, null]]
            },
            as: whitelister.pkh
        });
    });

    it("Assert receivers with only restricted users should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_receivers({
                arg: {
                    addrs: [list2_user1.pkh, carl.pkh]
                },
                as: whitelister.pkh
            });
        }, errors.USER_RESTRICTED)
    });

    it("Assert receivers with restricted and non restricted users should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_receivers({
                arg: {
                    addrs: [carl.pkh, list1_user1.pkh]
                },
                as: whitelister.pkh
            });
        }, errors.USER_RESTRICTED)
    });

    it("Assert receivers with unknown users should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_receivers({
                arg: {
                    addrs: [whitelister.pkh]
                },
                as: whitelister.pkh
            });
        }, errors.USER_RESTRICTED)
    });

    it("Assert receivers with users without allowed list should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_receivers({
                arg: {
                    addrs: [list1_user1.pkh]
                },
                as: whitelister.pkh
            });
        }, errors.USER_RESTRICTED)
    });

    it("Assert receivers with unrestricted users should succeed", async () => {
        await whitelist.assert_receivers({
            arg: {
                addrs: [list0_user2.pkh, list0_user1.pkh]
            },
            as: whitelister.pkh
        });
    });
});

describe("Assert transfers", async () => {
    it("Assert transfers [FROM: restriced, TO: restriced] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[carl.pkh, [list2_user1.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.FROM_RESTRICTED)
    });

    it("Assert transfers [FROM: not whitelisted, TO: not whitelisted] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[daniel.pkh, [eddy.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.FROM_RESTRICTED)
    });

    it("Assert transfers [FROM: restricted, TO: not whitelisted] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[carl.pkh, [eddy.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.FROM_RESTRICTED)
    });

    it("Assert transfers [FROM: not whitelisted, TO: restricted] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[eddy.pkh, [carl.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.FROM_RESTRICTED)
    });

    it("Assert transfers [FROM: whitelisted unrestricted, TO: restricted] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[list0_user1.pkh, [carl.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.TO_RESTRICTED)
    });

    it("Assert transfers [FROM: whitelisted unrestricted, TO: not whitelisted] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[list0_user1.pkh, [eddy.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.TO_RESTRICTED)
    });

    it("Assert transfers [FROM: whitelisted unrestricted, TO: not in FROM allowed list] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[list1_user2.pkh, [list1_user2.pkh]]]
                },
                as: whitelister.pkh
            });
        }, errors.TO_NOT_ALLOWED)
    });

    it("Assert transfers [FROM: whitelisted unrestricted, TO: in FROM allowed list] should succeed", async () => {
        await whitelist.assert_transfers({
            arg: {
                input_list: [[list1_user2.pkh, [list0_user2.pkh]]]
            },
            as: whitelister.pkh
        });
    });

    it("Assert transfers [FROM: not whitelisted, TO: not whitelisted, SENDER: super_user] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[jacky.pkh, [eddy.pkh]]]
                },
                as: super_user.pkh
            });
        }, errors.FROM_NOT_WHITELISTED)
    });

    it("Assert transfers [FROM: whitelisted, TO: not whitelisted, SENDER: super_user] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[list1_user2.pkh, [jacky.pkh]]]
                },
                as: super_user.pkh
            });
        }, errors.TO_NOT_WHITELISTED)
    });

    it("Assert transfers [FROM: restricted, TO: not whitelisted, SENDER: super_user] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[carl.pkh, [jacky.pkh]]]
                },
                as: super_user.pkh
            });
        }, errors.TO_NOT_WHITELISTED)
    });

    it("Assert transfers [FROM: not whitelisted, TO: restricted, SENDER: super_user] should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[jacky.pkh, [carl.pkh]]]
                },
                as: super_user.pkh
            });
        }, errors.FROM_NOT_WHITELISTED)
    });

    it("Assert transfers [FROM: unrestricted, TO: not in FROM allowed list, SENDER: super_user] should succeed", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[carl.pkh, [list1_user2.pkh]]]
                },
                as: super_user.pkh
            });
        }, errors.FROM_RESTRICTED)
    });

    it("Assert transfers [FROM: unrestricted, TO: restricted, SENDER: super_user] should succeed", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfers({
                arg: {
                    input_list: [[list1_user2.pkh, [carl.pkh]]]
                },
                as: super_user.pkh
            });
        }, errors.TO_RESTRICTED)

    });

    it("Assert transfers [FROM: whitelisted unrestricted, TO: in FROM allowed list, , SENDER: super_user] should succeed", async () => {
        await whitelist.assert_transfers({
            arg: {
                input_list: [[list1_user2.pkh, [list0_user2.pkh]]]
            },
            as: super_user.pkh
        });
    });
});

describe("Assert transfer list", async () => {
    it("Assert transfer list with non existing from transfer list should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfer_list({
                arg: {
                    from_transfer_list_id: 666,
                    to_transfer_list_id: 1
                },
                as: whitelister.pkh
            });
        }, errors.FROM_TRANSFERLIST_NOT_FOUND)
    });

    it("Assert transfer list with non existing to transfer list should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfer_list({
                arg: {
                    from_transfer_list_id: 1,
                    to_transfer_list_id: 666
                },
                as: whitelister.pkh
            });
        }, errors.TO_TRANSFERLIST_NOT_FOUND)
    });

    it("Assert transfer list with restricted existing from transfer list should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfer_list({
                arg: {
                    from_transfer_list_id: 2,
                    to_transfer_list_id: 1
                },
                as: whitelister.pkh
            });
        }, errors.FROM_INVALID_UNRESTRICTED_STATE)
    });

    it("Assert transfer list with restricted existing to transfer list should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfer_list({
                arg: {
                    from_transfer_list_id: 1,
                    to_transfer_list_id: 2
                },
                as: whitelister.pkh
            });
        }, errors.TO_INVALID_UNRESTRICTED_STATE)
    });

    it("Assert transfer list with to transfer list not in from allowed lists should fail", async () => {
        await expectToThrow(async () => {
            await whitelist.assert_transfer_list({
                arg: {
                    from_transfer_list_id: 1,
                    to_transfer_list_id: 1
                },
                as: whitelister.pkh
            });
        }, errors.TO_TRANSFERLIST_NOT_FOUND_IN_FROM)
    });

    it("Assert transfer list with to transfer list  in from allowed lists should succeed", async () => {
        await whitelist.assert_transfer_list({
            arg: {
                from_transfer_list_id: 1,
                to_transfer_list_id: 0
            },
            as: whitelister.pkh
        });
    });
});
