/* J7: a tweet tracker feed for the terminal (modeled on the feed beside the board in TX Gym, made our own).
   - MOVERS (Elon Musk, toly, alon, pump.fun...) tweet a meme now and then. Within seconds bot deployers launch 4-10 coins
     on it. ONE of them is the "right" coin: the best ticker, on Pump, Dividends on. It bonds almost instantly and runs
     (a fast mega-runner chart), while the look-alikes (wrong ticker, wrong pad, no dividends) mostly fade or rug.
   - KOL TRADERS (Cupsey, Cented, decu, Gake, Jijo, theo, dv, Euris, Orangie, poorgoat, Ansem) post calls on live runners,
     sells, takes and flexes. A call brings their own buy plus a small follower wave; their wallets show their name on chart bubbles.
   - ALERT and NEWS bots post what really happens in the game: dev sells, migrations, rugs, whale buys, KOL buys, SOL moves.
   - NOISE accounts post ordinary tweets.
   Real names are the playtester's choice for private play (settings switch them to parody names). Real people only post harmless meme,
   pet and joke tweets in here, and KOLs only talk about the game's fictional coins. Everything is labeled SIM. No DOM. */
(function (g) {
  'use strict';
  const BH = g.BH = g.BH || {};

  // [id, real name, real handle, parody name, parody handle, followers, pfp, kind, power]
  const ACCOUNTS = [
    ['elon', 'Elon Musk', '@elonmusk', 'Elon Tusk', '@elontusk', 221e6, 101, 'mover', 1.0],
    ['toly', 'toly', '@toly', 'tolly', '@tolly_sol', 2.8e6, 88, 'mover', 0.7],
    ['alon', 'alon', '@a1lon9', 'Alon', '@alon_pump', 427e3, 23, 'mover', 0.65],
    ['pump', 'Pump.fun', '@Pumpfun', 'PumpLab', '@pumplab', 729e3, 60, 'mover', 0.6],
    ['ansem', 'Ansem', '@blknoiz06', 'Ansemm', '@ansemm', 790e3, 12, 'kol', 0.9],
    ['cupsey', 'Cupsey', '@Cupseyy', 'Cupsy', '@cupsy', 180e3, 31, 'kol', 0.75],
    ['cented', 'Cented', '@Cented7', 'Centd', '@centd', 150e3, 44, 'kol', 0.75],
    ['decu', 'decu', '@decu0x', 'deku', '@deku0x', 95e3, 52, 'kol', 0.6],
    ['gake', 'Gake', '@Ga__ke', 'Gayk', '@gayk', 120e3, 70, 'kol', 0.6],
    ['jijo', 'Jijo', '@jijo_exe', 'Jiji', '@jiji_exe', 85e3, 79, 'kol', 0.55],
    ['theo', 'theo', '@theonomix', 'theoo', '@theoo', 60e3, 91, 'kol', 0.5],
    ['dv', 'dv', '@vibed333', 'dvv', '@dvv333', 70e3, 104, 'kol', 0.5],
    ['euris', 'Euris', '@Euris_JT', 'Eurys', '@eurys', 55e3, 113, 'kol', 0.45],
    ['orangie', 'Orangie', '@orangie', 'Orangee', '@orangee', 240e3, 121, 'kol', 0.6],
    ['poorgoat', 'PoorGoat', '@PoorGoat_', 'poorgoatt', '@poorgoatt', 48e3, 130, 'kol', 0.45],
    // more well-known Solana memecoin traders (handles from memory; a few may be slightly off)
    ['frank', 'Frank', '@frankdegods', 'Franky', '@frankydegens', 260e3, 9, 'kol', 0.7],
    ['loopierr', 'Loopierr', '@Loopierr', 'Loopy', '@loopyy', 110e3, 18, 'kol', 0.55],
    ['jalen', 'Jalen', '@RipJalens', 'Jaylen', '@ripjaylen', 140e3, 26, 'kol', 0.6],
    ['kev', 'Kev', '@Kevsznx', 'Kevv', '@kevvsz', 75e3, 38, 'kol', 0.5],
    ['waddles', 'Waddles', '@waddles_eth', 'Waddls', '@waddls', 90e3, 46, 'kol', 0.5],
    ['assasin', 'Assasin', '@assasin_eth', 'Asasin', '@asasin', 85e3, 55, 'kol', 0.55],
    ['daumen', 'Daumen', '@daumeneth', 'Dauman', '@daumann', 70e3, 66, 'kol', 0.5],
    ['leens', 'Leens', '@leensx100', 'Leenz', '@leenzx', 60e3, 75, 'kol', 0.45],
    ['pow', 'Pow', '@traderpow', 'Powww', '@powwtrader', 105e3, 86, 'kol', 0.55],
    ['cooker', 'Cooker', '@CookerFlips', 'Kooker', '@kookerflips', 95e3, 97, 'kol', 0.5],
    // the playtester's picks (Nov 15)
    ['dvces', 'dvces', '@dvces', 'dvcez', '@dvcez', 65e3, 107, 'kol', 0.55],
    ['insentos', 'insentos', '@insentos', 'insentoz', '@insentoz', 58e3, 116, 'kol', 0.5],
    ['rasmr', 'rasmr', '@rasmr', 'rasmrr', '@rasmrr', 52e3, 125, 'kol', 0.5],
    ['cap', 'Cap', '@cap', 'Capp', '@capp', 80e3, 134, 'kol', 0.55],
    ['megga', 'Megga', '@megga', 'Mega', '@megaa', 70e3, 140, 'kol', 0.55],
    // big crypto names who tweet a meme now and then (harmless pet/joke tweets only)
    ['cz', 'CZ', '@cz_binance', 'CZZ', '@cz_binanse', 12.9e6, 3, 'mover', 0.85],
    // the playtester's real J7 alert accounts (highlight + sound in J7 Tracker, Nov 16)
    ['trump', 'Donald J. Trump', '@realDonaldTrump', 'Donald Trumpet', '@realdonaldtrumpet', 111.9e6, 41, 'mover', 0.95],
    ['donjr', 'Donald Trump Jr.', '@DonaldJTrumpJr', 'Donald Trumpet Jr.', '@donaldtrumpetjr', 16.2e6, 43, 'mover', 0.55],
    ['whitehouse', 'The White House', '@WhiteHouse', 'The Whitest House', '@whitesthouse', 5.36e6, 45, 'mover', 0.6],
    ['binance', 'Binance', '@binance', 'Binanse', '@binanse', 16.1e6, 47, 'mover', 0.6],
    ['solana', 'Solana', '@solana', 'Solano', '@solano_net', 4.22e6, 49, 'mover', 0.5],
    ['bubblemaps', 'Bubblemaps', '@bubblemaps', 'Bubblemapz', '@bubblemapz', 293e3, 51, 'voice', 0],
    ['chainchomp', 'ChainChomp131', '@chainchomp131', 'ChainChump131', '@chainchump131', 56e3, 53, 'mover', 0.45],
    ['vitalik', 'vitalik.eth', '@VitalikButerin', 'vitalek.eth', '@vitalekbuterin', 7.9e6, 11, 'mover', 0.6],
    ['raj', 'raj', '@rajgokal', 'rajj', '@rajgokall', 2.3e6, 19, 'mover', 0.5],
    ['mert', 'mert', '@mert', 'mertt', '@mertt', 2.3e6, 29, 'mover', 0.45],
    ['murad', 'Murad', '@MustStopMurad', 'Muradd', '@muststopmuradd', 725e3, 37, 'mover', 0.55],
    ['unipcs', 'Unipcs (Bonk Guy)', '@theunipcs', 'Unipcz', '@theunipcz', 340e3, 47, 'mover', 0.45],
    // more trench KOLs (whales: 2-5 SOL buy-ins)
    ['jakey', 'Jakey', '@SolJakey', 'Jakeyy', '@soljakeyy', 217e3, 53, 'kol', 0.6],
    ['kook', 'kook', '@KookCapitalLLC', 'kookk', '@kookcapitall', 185e3, 59, 'kol', 0.55],
    ['latuche', 'Latuche', '@Latuche95', 'Latuch', '@latuch95', 34e3, 65, 'kol', 0.45],
    ['kreo', 'kreo', '@kreo444', 'kreoo', '@kreoo444', 35e3, 71, 'kol', 0.45],
    ['threadguy', 'threadguy', '@notthreadguy', 'threadguyy', '@notthreadguyy', 413e3, 77, 'kol', 0.6],
    ['gainzy', 'gainzy', '@gainzy222', 'gainzyy', '@gainzyy222', 333e3, 83, 'kol', 0.55],
    ['marcell', 'Marcell', '@MarcellxMarcell', 'Marcel', '@marcelxmarcel', 151e3, 89, 'kol', 0.5],
    ['cbs', 'Cold Blooded Shiller', '@ColdBloodShill', 'Cold Blooded Shilla', '@coldbloodshilla', 351e3, 95, 'kol', 0.55],
    ['sisyphus', 'Sisyphus', '@0xSisyphus', 'Sisyfus', '@0xsisyfus', 155e3, 101, 'kol', 0.5],
    ['dingaling', 'dingaling', '@dingalingts', 'dingalingg', '@dingalingtss', 251e3, 109, 'kol', 0.6],
    ['mrpunk', 'Mrpunk.eth', '@mrpunkdoteth', 'Mrpunkk', '@mrpunkkdoteth', 171e3, 115, 'kol', 0.5],
    ['gmoney', 'gmoney', '@gmoneyNFT', 'gmoneyy', '@gmoneyynft', 317e3, 121, 'kol', 0.5],
    ['becker', 'Alex Becker', '@ZssBecker', 'Alex Bekker', '@zssbekker', 1.3e6, 127, 'kol', 0.6],
    ['tradersz', 'TraderSZ', '@trader1sz', 'TraderZS', '@trader1zs', 694e3, 133, 'kol', 0.5],
    // from the playtester's tracked wallets (active Nov 2026): real names, X / Twitch pictures, real wallets
    ['nach', 'Nach', '@NachSOL', 'Nachh', '@nachsoll', 32e3, 9, 'kol', 0.55],
    ['clukz', 'clukz', '@clukz', 'clukzz', '@clukzz', 39e3, 14, 'kol', 0.5],
    ['tdmilky', 'milky', '@tdmilky', 'milkyy', '@tdmilkyy', 8.5e3, 17, 'kol', 0.45],
    ['zemrics', 'Zemrics', '@Zemrics', 'Zemrix', '@zemrix', 9.6e3, 22, 'kol', 0.45],
    ['bugha', 'bugha', '@bugha', 'bugga', '@buggha', 1.96e6, 26, 'kol', 0.6],
    ['nyhrox', 'Nyhrox', '@nyhrox', 'Nyrox', '@nyrox', 214e3, 35, 'kol', 0.55],
    // influential voices: market takes, no coins (they never call the game's coins)
    ['cobie', 'Cobie', '@cobie', 'Cobee', '@cobee', 1.25e6, 4, 'voice', 0],
    ['hsaka', 'Hsaka', '@HsakaTrades', 'Hsakaa', '@hsakaatrades', 600e3, 10, 'voice', 0],
    ['kaleo', 'K A L E O', '@CryptoKaleo', 'K A L E E', '@cryptokalee', 728e3, 16, 'voice', 0],
    ['hayes', 'Arthur Hayes', '@CryptoHayes', 'Arthur Haze', '@cryptohaze', 822e3, 22, 'voice', 0],
    ['smolting', 'smolting', '@inversebrah', 'smoltin', '@inversebrahh', 706e3, 28, 'voice', 0],
    ['pomp', 'Anthony Pompliano', '@APompliano', 'Anthony Pomp', '@apomplianoo', 2.4e6, 34, 'voice', 0],
    ['spartan', 'DegenSpartan', '@DegenSpartan', 'DegenSpartn', '@degenspartn', 270e3, 40, 'voice', 0],
    ['light', 'light', '@lightcrypto', 'lite', '@litecrypto', 181e3, 48, 'voice', 0],
    ['pentoshi', 'Pentoshi', '@Pentosh1', 'Pentoshee', '@pentoshee', 942e3, 54, 'voice', 0],
    ['gcr', 'GCR', '@GCRClassic', 'GCRR', '@gcrclassicc', 391e3, 62, 'voice', 0],
    ['aixbt', 'aixbt', '@aixbt_agent', 'aixbtt', '@aixbtt_agent', 461e3, 68, 'voice', 0],
    // real news and on-chain alert accounts: they post what really happens in the game (SIM)
    ['whalealert', 'Whale Alert', '@whale_alert', 'Whale Alertz', '@whale_alertz', 2.8e6, 74, 'news', 0],
    ['lookonchain', 'Lookonchain', '@lookonchain', 'Lookonchane', '@lookonchane', 712e3, 80, 'news', 0],
    ['watcherguru', 'Watcher Guru', '@WatcherGuru', 'Watcher Gooroo', '@watchergooroo', 4.9e6, 86, 'news', 0],
    ['db', 'db', '@tier10k', 'dbb', '@tier10kk', 1.1e6, 92, 'news', 0],
    ['solfloor', 'SolanaFloor', '@SolanaFloor', 'SolanaFlor', '@solanaflor', 135e3, 98, 'news', 0],
    ['degennews', 'DEGEN NEWS', '@DegenerateNews', 'DEGEN NUZE', '@degeneratenuze', 425e3, 106, 'news', 0],
    // a regular timeline (made up): general news desks and everyday people
    ['worldwire', 'World Wire', '@worldwire_news', null, null, 3.2e6, 112, 'general', 0],
    ['dailybrief', 'The Daily Brief', '@dailybrief', null, null, 1.8e6, 118, 'general', 0],
    ['sportsdesk', 'Sports Desk', '@sportsdesk_live', null, null, 2.1e6, 124, 'general', 0],
    ['techpulse', 'Tech Pulse', '@techpulse', null, null, 905e3, 131, 'general', 0],
    ['weathernow', 'Weather Now', '@weathernow', null, null, 640e3, 137, 'general', 0],
    ['dnn', 'Degen News Network', '@degennewsnet', null, null, 410e3, 143, 'general', 0],
    ['jess', 'jess', '@jess_irl', null, null, 1240, 5, 'people', 0],
    ['coffeedad', 'coffee dad', '@coffee_dad', null, null, 3400, 13, 'people', 0],
    ['gymmo', 'Mo', '@gymrat_mo', null, null, 890, 21, 'people', 0],
    ['plantmom', 'plant mom', '@plantmom_', null, null, 5100, 31, 'people', 0],
    ['dre', 'Dre', '@hoops_dre', null, null, 2200, 39, 'people', 0],
    ['ramenqueen', 'ramen queen', '@ramenqueen', null, null, 7700, 45, 'people', 0],
    ['devdan', 'dan', '@devops_dan', null, null, 1900, 51, 'people', 0],
    ['catsdaily', 'Cats Daily', '@catpicsdaily', null, null, 210e3, 61, 'people', 0],
    ['kayla', 'kayla', '@kayla_studies', null, null, 640, 67, 'people', 0],
    ['ty', 'ty', '@ty_plays', null, null, 3300, 73, 'people', 0],
    ['whalewire', 'Whale.Wire', '@whalewire', null, null, 1.4e6, 7, 'alert', 0],
    ['rugradar', 'Rug Radar', '@rugradar', null, null, 220e3, 15, 'alert', 0],
    ['migalerts', 'Migration Alerts', '@migrationalert', null, null, 33.9e3, 27, 'alert', 0],
    ['kolwatch', 'KOL Watch', '@kolwatch_bot', null, null, 96e3, 35, 'alert', 0],
    ['tickertape', 'Ticker Tape', '@tickertapehq', null, null, 812e3, 41, 'news', 0],
    ['marketsiren', 'Market Siren', '@marketsiren', null, null, 690e3, 49, 'news', 0],
    ['natureiswild', 'Nature Is Wild', '@nature_is_wild', null, null, 1.1e6, 57, 'noise', 0],
    ['weirdinv', 'Weird Inventions', '@weirdinventions', null, null, 730e3, 63, 'noise', 0],
    ['moonboi', 'moonboi.sol', '@moonboi_sol', null, null, 23.9e3, 72, 'noise', 0],
    ['larry', 'Lowcap Larry', '@lowcaplarry', null, null, 31.4e3, 84, 'noise', 0],
  ];
  // real X profile pictures and follower counts from each account's public profile (looked up Nov 16, 2026 through fxtwitter's
  // public profile API). Pictures load live from X's image server while real names are on; never stored in the game.
  const DEFAULT_PFP = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#dfe3ee"/><circle cx="50" cy="38" r="19" fill="#fff"/><path d="M12 100c0-24 17-38 38-38s38 14 38 38z" fill="#fff"/></svg>');
  // dvces and decu: their Twitch pictures (crypto streamers; the X handles in the game belong to someone else / are suspended)
  const REAL_WALLETS = {"nach":"9jyqFiLnruggwNn4EQwBNFXwpbLM9hrA4hV59ytyAVVz","clukz":"G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC","tdmilky":"CEUA7zVoDRqRYoeHTP58UHU6TR8yvtVbeLrX1dppqoXJ","zemrics":"EP5mvfhGv6x1XR33Fd8eioiYjtRXAawafPmkz9xBpDvG","bugha":"HABhDh9zrzf8mA4SBo1yro8M6AirH2hZdLNPpuvMH6iA","nyhrox":"FAwHi11KyJVh2pR2b2vNFEbbunTVkMFpdNBuD2dh9NRf","ansem":"GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52","cupsey":"suqh5sHtr8HyJ7q8scBimULPkPpA557prMG47xCHQfK","cented":"CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o","decu":"4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9","gake":"DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm","jijo":"4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk","dv":"BCagckXeMChUKrHEd6fKFA1uiWDtcmCXMsqaheLiUPJd","euris":"DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj","orangie":"BtDaZUqHr2mKH5EYQCztuerHBuBEfQNYdquTDtEZp2Ym","poorgoat":"8k1sAmVUjzaZkxqexeYkCPphjcQobYugQeGmCyvKtHNG","frank":"498g1rVnFcnjBjpfw1xyqA1WvgQXUU8RWuELjxkjAayQ","loopierr":"9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL","jalen":"F72vY99ihQsYwqEDCfz7igKXA5me6vN2zqVsVUTpw6qL","waddles":"73LnJ7G9ffBDjEBGgJDdgvLUhD5APLonKrNiHsKDCw5B","assasin":"6LChaYRYtEYjLEHhzo4HdEmgNwu2aia8CM8VhR9wn6n7","daumen":"8MaVa9kdt3NW4Q5HyNAm1X5LbR8PQRVDc1W8NMVK88D5","leens":"7Dt5oUpxHWuKH8bCTXDLz2j3JyxA7jEmtzqCG6pnh96X","pow":"8zFZHuSRuDpuAR7J6FzwyF3vKNx4CVW3DFHJerQhc7Zd","cooker":"8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6","rasmr":"9CNyLECt2j8tnDhqxtjYk5HUhZ2b8Nwnyb7sfYN7vND2","megga":"H31vEBxSJk1nQdUN11qZgZyhScyShhscKhvhZZU3dQoU","latuche":"GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65","kreo":"BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc","marcell":"ATFRUwvyMh61w2Ab6AZxUyxsAfiiuG1RqL6iv3Vi9q2B","dingaling":"9X5n5i1mugTjgGPhqf1KJDt8r4kD8TF3s62ttbxKzFHa","murad":"7QZGS7MQ4S6hRmE8iXoFTXgQ2hXVUCho2ZhgeWvLNPZT","cobie":"HaZtFxgw99iM97LxmwFuDW6k4MP1XwsWTGoy7GUoSELj"};
  const XPROF = {"realdonaldtrump":[111873871,"https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_200x200.jpg"],"donaldjtrumpjr":[16151990,"https://pbs.twimg.com/profile_images/766652495858896897/LjrJJB9a_200x200.jpg"],"whitehouse":[5359432,"https://pbs.twimg.com/profile_images/2062605835256127489/atNMwHxg_200x200.jpg"],"binance":[16105940,"https://pbs.twimg.com/profile_images/1940131561103347712/f5y2qENu_200x200.jpg"],"solana":[4218903,"https://pbs.twimg.com/profile_images/2121919498051624960/ZB7xMYp9_200x200.jpg"],"bubblemaps":[293500,"https://pbs.twimg.com/profile_images/1542463278412169216/dj1tOY36_200x200.png"],"chainchomp131":[55947,"https://pbs.twimg.com/profile_images/1559965882402553856/gxBK-A2x_200x200.jpg"],"nachsol":[32340,"https://pbs.twimg.com/profile_images/1839922493898870784/UMzRfOLb_200x200.jpg"],"clukz":[38867,"https://pbs.twimg.com/profile_images/2055783644116172800/mQAVPKOF_200x200.jpg"],"tdmilky":[8539,"https://pbs.twimg.com/profile_images/1917024295160537088/75bNXbpt_200x200.jpg"],"zemrics":[9601,"https://pbs.twimg.com/profile_images/1958703243368046594/XJAGP5XN_200x200.jpg"],"bugha":[1964550,"https://pbs.twimg.com/profile_images/2037635356091400192/_NKSvdbe_200x200.jpg"],"nyhrox":[0,"https://static-cdn.jtvnw.net/jtv_user_pictures/eaedadf4-c0cc-414f-801e-2a0f95d587f4-profile_image-300x300.png"],"dvces":[0,"https://static-cdn.jtvnw.net/jtv_user_pictures/ce338330-e9a1-4a54-bef0-9c6e6f4fb136-profile_image-300x300.png"],"decu0x":[0,"https://static-cdn.jtvnw.net/jtv_user_pictures/461be6d3-b2eb-4729-ae24-7e748d40dece-profile_image-300x300.png"],"elonmusk":[240788100,"https://pbs.twimg.com/profile_images/2103567689515954176/aR-Kjpp4_200x200.jpg"],"a1lon9":[434040,"https://pbs.twimg.com/profile_images/1875434258426187776/XUJTdd67_200x200.jpg"],"ga__ke":[187219,"https://pbs.twimg.com/profile_images/2122020260698300417/xfvZqrfL_200x200.jpg"],"theonomix":[14406,"https://pbs.twimg.com/profile_images/1893497942536839168/jAnhisDN_200x200.jpg"],"vibed333":[43116,"https://pbs.twimg.com/profile_images/1757177002183073792/m7xCuBy0_200x200.jpg"],"orangie":[441230,"https://pbs.twimg.com/profile_images/2105410277877719040/Y0J2vP7B_200x200.jpg"],"ripjalens":[65940,"https://pbs.twimg.com/profile_images/2108643870007238658/JD1r0r9w_200x200.jpg"],"kevsznx":[19928,"https://pbs.twimg.com/profile_images/2122069407752962048/pr_TxXU9_200x200.jpg"],"waddles_eth":[35130,"https://pbs.twimg.com/profile_images/2103307140957917184/5Tbv7cW4_200x200.jpg"],"assasin_eth":[69244,"https://pbs.twimg.com/profile_images/2120150163876380672/NBMgee52_200x200.jpg"],"daumeneth":[12664,"https://pbs.twimg.com/profile_images/2003790330353909760/GRQ-mQG9_200x200.jpg"],"leensx100":[41436,"https://pbs.twimg.com/profile_images/1818713990588989440/VlX8E_8F_200x200.jpg"],"traderpow":[215368,"https://pbs.twimg.com/profile_images/2006851277851160576/L8vAUJOH_200x200.jpg"],"cookerflips":[138787,"https://pbs.twimg.com/profile_images/2095887405551394816/NyciTi7C_200x200.jpg"],"cap":[30446,"https://pbs.twimg.com/profile_images/2115406610591821824/pPmvAHx2_200x200.jpg"],"megga":[571687,"https://pbs.twimg.com/profile_images/1765459126509785088/3lQvo1y3_200x200.jpg"],"cz_binance":[12959934,"https://pbs.twimg.com/profile_images/2041696316451909632/7K4xEnRE_200x200.jpg"],"rajgokal":[2349618,"https://pbs.twimg.com/profile_images/1984256809427955712/H9T9bSeV_200x200.jpg"],"muststopmurad":[725341,"https://pbs.twimg.com/profile_images/2084373240508510208/BCXFWGNA_200x200.jpg"],"cobie":[1247697,"https://pbs.twimg.com/profile_images/1955773696565719040/zVpm_8at_200x200.jpg"],"hsakatrades":[599884,"https://pbs.twimg.com/profile_images/1690929913270792192/6n-PzBnB_200x200.jpg"],"cryptokaleo":[727991,"https://pbs.twimg.com/profile_images/2103001655104901120/E3gT5gmK_200x200.jpg"],"cryptohayes":[822440,"https://pbs.twimg.com/profile_images/2089662301268025344/yc8Jl5zr_200x200.jpg"],"apompliano":[2438927,"https://pbs.twimg.com/profile_images/1547787118243561478/PxWzJo1H_200x200.jpg"],"degenspartan":[269885,"https://pbs.twimg.com/profile_images/1608325033033895938/US2YmCwR_200x200.jpg"],"lightcrypto":[181433,"https://pbs.twimg.com/profile_images/1478019214212747264/LZmNClhs_200x200.jpg"],"pentosh1":[942068,"https://pbs.twimg.com/profile_images/2095507700398587904/TOfOsTF3_200x200.jpg"],"notthreadguy":[412690,"https://pbs.twimg.com/profile_images/2062220989379825665/ergNEj5z_200x200.jpg"],"gainzy222":[333244,"https://pbs.twimg.com/profile_images/1763753850240983040/bg9hu_kW_200x200.jpg"],"marcellxmarcell":[150693,"https://pbs.twimg.com/profile_images/2120924609952546816/dK2MrPml_200x200.jpg"],"coldbloodshill":[351443,"https://pbs.twimg.com/profile_images/2004120761561133056/gr5j9RJG_200x200.jpg"],"0xsisyphus":[155305,"https://pbs.twimg.com/profile_images/2096304532099829760/hgWz8ZiD_200x200.jpg"],"dingalingts":[250526,"https://pbs.twimg.com/profile_images/1671535865145745410/DaM1zme1_200x200.jpg"],"cupseyy":[239677,"https://pbs.twimg.com/profile_images/1878584793249583104/WMH0-IGY_200x200.jpg"],"frankdegods":[541633,"https://pbs.twimg.com/profile_images/2060043584204689410/Sh83nkwV_200x200.jpg"],"loopierr":[36839,"https://pbs.twimg.com/profile_images/1946997538101288962/lIzkiyGF_200x200.jpg"],"insentos":[65642,"https://pbs.twimg.com/profile_images/2039166755872866304/tNMpFYj0_200x200.jpg"],"theunipcs":[340214,"https://pbs.twimg.com/profile_images/1755899881783185408/Mtp0uwfM_200x200.jpg"],"zssbecker":[1324778,"https://pbs.twimg.com/profile_images/2039344460434153472/xZVWU2Js_200x200.jpg"],"poorgoat_":[110226,"https://pbs.twimg.com/profile_images/2117641381489299456/k1SI2jHq_200x200.jpg"],"blknoiz06":[1444908,"https://pbs.twimg.com/profile_images/2120295476029194240/GxsF3s-A_200x200.jpg"],"cented7":[821028,"https://pbs.twimg.com/profile_images/2071467491918815232/0J-MZRTV_200x200.jpg"],"jijo_exe":[31964,"https://pbs.twimg.com/profile_images/1819429766828568576/wJCaFLgE_200x200.jpg"],"vitalikbuterin":[7914416,"https://pbs.twimg.com/profile_images/2042521108067352576/3rv2_9m1_200x200.jpg"],"inversebrah":[706068,"https://pbs.twimg.com/profile_images/2077933145668902912/7E4kQ4_s_200x200.jpg"],"gcrclassic":[390587,"https://pbs.twimg.com/profile_images/1622015225573646336/jIHb2Pbs_200x200.jpg"],"whale_alert":[2842474,"https://pbs.twimg.com/profile_images/1132579647374417921/9ifIGXEQ_200x200.png"],"lookonchain":[711596,"https://pbs.twimg.com/profile_images/1551771778472497152/ocyqhsbm_200x200.jpg"],"watcherguru":[4924985,"https://pbs.twimg.com/profile_images/1641221212578754562/DfiC0KW2_200x200.png"],"tier10k":[1095030,"https://pbs.twimg.com/profile_images/1416723334683893767/HvpCjb43_200x200.jpg"],"solanafloor":[135302,"https://pbs.twimg.com/profile_images/1836427519836217344/kQxl-LQo_200x200.png"],"degeneratenews":[424794,"https://pbs.twimg.com/profile_images/2004903697399025664/PiqB7EJS_200x200.jpg"],"cointelegraph":[2928773,"https://pbs.twimg.com/profile_images/1755983593925378048/kYutau0B_200x200.jpg"],"coindesk":[4076747,"https://pbs.twimg.com/profile_images/1840920544608165896/niPELF6e_200x200.jpg"],"aixbt_agent":[461075,"https://pbs.twimg.com/profile_images/1874758416658509824/UPaVddbm_200x200.jpg"],"zachxbt":[1118114,"https://pbs.twimg.com/profile_images/2066493905475104768/41thGIDX_200x200.jpg"],"solana":[4218888,"https://pbs.twimg.com/profile_images/2121919498051624960/ZB7xMYp9_200x200.jpg"],"jessepollak":[354894,"https://pbs.twimg.com/profile_images/1879556312822120448/QngrqCSC_200x200.jpg"],"brian_armstrong":[3952483,"https://pbs.twimg.com/profile_images/2078293582918934528/YZjOB_hV_200x200.jpg"],"saylor":[5220814,"https://pbs.twimg.com/profile_images/1485632175932383235/8t0DGo6V_200x200.jpg"],"mrpunkdoteth":[170960,"https://pbs.twimg.com/profile_images/1950716752549310464/TShw0Qqc_200x200.jpg"],"gmoneynft":[317571,"https://pbs.twimg.com/profile_images/1626216945698881541/kF6xM_Cb_200x200.jpg"],"trader1sz":[694223,"https://pbs.twimg.com/profile_images/2068728086665756672/Cx-4aQPE_200x200.jpg"],"bonk_inu":[448182,"https://pbs.twimg.com/profile_images/1600956334635098141/ZSzYTrHf_200x200.jpg"],"kookcapitalllc":[184824,"https://pbs.twimg.com/profile_images/1724383779307843584/YiFv8ORd_200x200.jpg"],"soljakey":[217175,"https://pbs.twimg.com/profile_images/2054466150948622336/EP1yjB-6_200x200.jpg"],"giganticrebirth":[253555,"https://pbs.twimg.com/profile_images/1881690179636994048/m35CulYY_200x200.jpg"],"thecexoffender":[28294,"https://pbs.twimg.com/profile_images/1942835205493923840/0SJmHhQI_200x200.jpg"],"latuche95":[34479,"https://pbs.twimg.com/profile_images/2003840312242782209/3qLHNhYs_200x200.jpg"],"kreo444":[35439,"https://pbs.twimg.com/profile_images/2085666414128517120/Vz80nek9_200x200.jpg"],"zinceth":[38568,"https://pbs.twimg.com/profile_images/2109458384252477440/VQmWxy8F_200x200.jpg"],"dior100x":[130091,"https://pbs.twimg.com/profile_images/2120860700423983105/vKkddYTX_200x200.jpg"],"toly":[2708388,"https://pbs.twimg.com/profile_images/2120273337930915840/Vew9h7W3_200x200.jpg"],"pumpfun":[750764,"https://pbs.twimg.com/profile_images/2112680263079895040/NP4456_o_200x200.jpg"],"mert":[2310847,"https://pbs.twimg.com/profile_images/1975912876243095552/YlVLO4Oz_200x200.jpg"]};
  // memes a mover can tweet: [tweet text with {m} where the meme name goes, meme name]
  const MEMES = [
    ['my dog {m} just ate a sock and a phone charger', 'Biscuit'], ['just named my new puppy {m}', 'Waffle'], ['{m} when the food bowl is only 90% full', 'Pumpkin'],
    ['if aliens exist their leader is 100% named {m}', 'Zorp'], ['the floor is {m}', 'Lava'], ['{m} is the only honest animal', 'Possum'],
    ['who let {m} into the server room', 'Gremlin'], ['{m} would never rug you', 'Grandma'], ['the robot in my kitchen is called {m} now', 'Toaster Bot'],
    ['saw a frog wearing a crown today. his name is {m}', 'Frog King'], ['{m} season is coming', 'Penguin'], ['{m}.', 'Hamster'],
    ['bought a goldfish. calling it {m}', 'Bubbles'], ['my cat {m} has opinions about the market', 'Mittens'], ['{m} is my favorite emoji now', 'Moai'],
    ['you guys ever think about {m}', 'Space Cow'], ['the {m} is watching', 'Owl'], ['new pet: a tiny {m}', 'Axolotl'],
    ['{m} on the moon by 2030', 'Moon Dog'], ['i am {m}', 'Groot Cat'], ['the trenches need a hero. it is {m}', 'Trench Rat'],
    ['{m} wif hat', 'Doge'], ['meet {m}, our new office dog', 'Pixel'], ['{m} just went viral in japan', 'Mochi'], ['{m} said gm', 'Gecko'],
  ];
  const KOL_LINES = {
    call: ['aped ${t}', '${t} looking like the one', 'small bag ${t}, chart is clean', '${t} is the og, the rest are copies', 'riding ${t} into the night', 'loaded ${t} here', '${t} 🤝'],
    sell: ['out of ${t}. too many copies', 'took profit on ${t}', 'sold ${t}, will rebuy lower', 'trimmed ${t}, playing with house money'],
    take: ['trenches are cooked today', 'no new runners, just sitting on hands', 'if you are not up today just log off', 'the bots are faster than ever', 'gm. waiting for a tweet', 'pvp is insane rn', 'do not chase the copies'],
    flex: ['+{x} SOL today', 'closed +{x} SOL. bed', 'what a session. +{x} SOL'],
  };
  const NOISE = {
    natureiswild: ['a mantis shrimp punches with the speed of a bullet', 'baby otters hold hands while they sleep', 'this octopus just opened a jar'],
    weirdinv: ['these shoes tie themselves when you stand up', 'a toaster that prints the weather on your bread', 'a pillow that tells you to go to bed'],
    moonboi: ['the dog chewed my hardware wallet cable', 'one more coin then bed', 'gm frens'],
    larry: ['the next 100x is in new pairs right now and you scrolled past it', 'lowcaps only. this is the way', 'everyone is a genius in a bull market'],
  };
  const VOICE = ['gm', 'patience is a position', 'zoom out', 'most of you would be up if you just did nothing', 'take profits. seriously', 'nobody rings a bell at the top', 'size down, live longer', 'bear markets build, bull markets pay', 'stop checking the chart every 5 seconds', 'risk management is the whole game', 'this cycle is different (it is not)', 'touch grass, then come back', 'the best trade today might be no trade', 'everyone is a genius until the music stops', 'liquidity is the only narrative', 'the market can stay irrational longer than you can stay solvent', 'quiet weekend. good time to read', 'if it feels obvious, it is probably priced in'];
  const TOPICS = {
    elon: ['Starship is the most ambitious rocket ever attempted', 'the path to Mars is getting clearer', 'FSD keeps getting better with every release', 'Optimus will be the biggest product of all time', 'Grok is getting smarter fast', 'X is the place for real-time news', 'the best part is no part', 'physics is the law, everything else is a recommendation', 'interesting', 'concerning', 'true', '!!', 'the most entertaining outcome is the most likely', 'Starlink is a lifeline in remote places', 'sustainable energy is the future', 'AI should be maximally truth-seeking', '🚀💫'],
    toly: ['increase bandwidth, reduce latency', 'internet capital markets', 'chewing glass', 'blocks keep getting bigger', 'the fastest chain wins', 'ship it', 'one global state machine', 'more cores, more throughput'],
    alon: ['noti\'s on', 'stream tonight', 'the coins are getting crazier', 'we ship every week', 'gm trenchers', 'love seeing new devs launch'],
    pump: ['new coins every second', 'go live on your coin', 'gm to every dev launching today', 'the trenches never sleep', 'callouts are the new alpha'],
    cz: ['4', 'keep building', 'ignore FUD, fake news and attacks', 'education is the best investment', 'funds are safu', 'not financial advice. never is', 'the best time to build is in a bear market', 'stay humble', 'builders on BNB Chain are cooking'],
    vitalik: ['privacy is a public good', 'decentralization is not a feature you add later', 'scale the L1 and the L2s together', 'zk proofs will be everywhere', 'd/acc', 'ethereum should feel boring and reliable', 'the best protocols are the ones you stop noticing'],
    raj: ['the phone in your pocket should hold your keys', 'consumer crypto is the next wave', 'builders, keep shipping', 'solana summer never ended', 'gm from the mobile team'],
    mert: ['solana is fast. that is the tweet', 'not all RPCs are the same', 'stop fudding things you have not used', 'privacy will matter more than you think', 'shitpost hour', 'i fud solana the most and i still build on it'],
    murad: ['memecoins are the purest form of community', 'conviction is everything', 'the memecoin supercycle is not over', 'find a strong community and hold', 'stop selling your bags to people who believe more than you', 'cults outperform'],
    unipcs: ['bonk', 'the dog coin of solana', 'strong hands win', 'still holding, never selling', 'community over everything'],
    cobie: ['you are not early', 'imagine selling the bottom', 'crypto twitter is the best reality show', 'the market humbles everyone eventually', 'up only (not financial advice)'],
    hsaka: ['shorts got cooked', 'chop until it does not', 'funding is too hot', 'levels below', 'buy the dip they said', 'patience, then size'],
    kaleo: ['send it', 'higher', 'the chart does not lie', 'breakout loading', 'bull flag on the daily', 'see you at the highs'],
    hayes: ['liquidity drives everything', 'the printer always comes back', 'buy the dip with both hands', 'fiat debasement is the trade', 'watch dollar liquidity, not the halving'],
    smolting: ['wen moon fren', 'smol brain big bags', 'ser this is a casino', 'wassie stays poor but happy', 'gm frens, mi am still here'],
    pomp: ['bitcoin fixes this', 'long-term holders keep winning', 'stay humble, stack sats', 'the macro case for bitcoin keeps getting stronger', 'time in the market beats timing the market'],
    spartan: ['most of you will not make it', 'this is not financial advice, it is financial entertainment', 'everything is a ponzi if you squint', 'study the incentives'],
    light: ['vol is coming', 'risk management over everything', 'patience pays'],
    pentoshi: ['set your invalidation before you enter', 'no trade is also a trade', 'chart looks heavy here', 'be patient, the market will give you a setup', 'protect your capital first'],
    gcr: ['the crowd is early to the wrong trade', 'fade the euphoria', 'the obvious trade rarely pays'],
    aixbt: ['analyzing on-chain flows...', 'mindshare rotating to AI agents', 'smart money accumulating quietly', 'monitoring 400+ accounts. sentiment: mixed', 'narrative velocity rising on solana memes'],
  };
  // movers' meme tweets in their own voice (the meme name is still the coin race)
  const MOVER_MEMES = {
    elon: [['naming the next Starship booster {m}', 'Booster Bob'], ['the robot in the Tesla factory is called {m} now', 'Optimus Prime'], ['Grok, draw {m} on Mars', 'Mars Doge'], ['{m} is the official mascot of X now (jk)', 'X Dog']],
    cz: [['my cat {m} says keep building', 'Builder Cat'], ['{m}. that is the tweet', 'Four']],
    vitalik: [['{m} is the most decentralized animal', 'Unicorn'], ['our dog {m} runs a node now', 'Node Dog']],
    murad: [['{m} has the strongest community i have seen', 'Cult Cat']],
    unipcs: [['the new dog in the trenches is {m}', 'Bonk Pup']],
  };
  const GENERAL = {
    worldwire: ['Heavy rain expected across the coast this weekend', 'Scientists describe a new species of deep-sea jellyfish', 'Airport delays continue as fog rolls in', 'Record crowd at this morning\'s city marathon', 'Rescue crews free a whale tangled in fishing line', 'A rare full moon is visible tonight with clear skies in most areas', 'Volunteers plant 10,000 trees in a single weekend', 'Museum reopens after a two-year renovation'],
    dailybrief: ['Coffee prices are up again this month', 'Study: a short walk after lunch helps focus', 'City council approves new bike lanes downtown', 'Movie theaters report their busiest weekend this year', 'Grocery bills: what is getting cheaper and what is not', 'Remote work: more companies ask staff back three days a week', 'The best time to book holiday flights, according to travel agents'],
    sportsdesk: ['FINAL: overtime thriller ends on a buzzer beater', 'Rookie drops 41 in his first start', 'Trade deadline is in two days. who is moving?', 'Underdog stuns the champs in straight sets', 'Walk-off home run in the 10th', 'Derby day ends 2-2 after a late equalizer', 'Injury update: star guard listed as day-to-day'],
    techpulse: ['New phone update adds a battery saver mode', 'Every app is adding an AI assistant now. is anyone using them?', 'Hands-on with the new foldables: better hinges, same price', 'Password managers: how to pick one', 'The browser wars are back', 'Smart glasses are trying again', 'Your old laptop can run more than you think'],
    weathernow: ['Heat advisory in effect until 8 PM. stay hydrated', 'First snow of the season for the mountains tonight', 'Thunderstorms likely after 4 PM', 'Perfect beach weather this weekend: sunny and 78°', 'Dense fog this morning. drive safe', 'Windy afternoon, gusts up to 40 mph'],
  };
  const PEOPLE = {
    jess: ['monday again already??', 'the group chat is unhinged today', 'why is it so hard to wake up', 'pizza or tacos tonight', 'it is raining and i love it'],
    coffeedad: ['coffee number three and it is 9am', 'kids asked what i do at work. i said "meetings"', 'grilled the perfect steak tonight', 'lawn is mowed. weekend can start'],
    gymmo: ['leg day. pray for me', 'gym was packed at 6am, who are these people', 'new PR on bench 💪', 'rest day = pizza day'],
    plantmom: ['my monstera has a new leaf 🌿', 'repotted 6 plants today', 'do not overwater your succulents', 'plant count: 47. send help'],
    dre: ['who else is watching the game tonight', 'that ref needs glasses', 'pickup run at the park, 3 wins straight', 'refs let them play tonight'],
    ramenqueen: ['made ramen from scratch. 10/10', 'trying a new recipe tonight', 'best dumplings in the city, no debate', 'midnight snack: cereal'],
    devdan: ['deployed on a friday. pray for me', 'finally fixed the bug. it was a typo', 'it works on my machine', 'meeting that could have been an email, part 4'],
    catsdaily: ['this cat thinks he is a dog', 'loaf mode activated', 'when the box is more fun than the toy', 'caught stealing socks again'],
    kayla: ['exam tomorrow and i know nothing', 'library at 2am hits different', 'group project: i did all of it', 'one more chapter then sleep (lie)'],
    ty: ['new high score', 'who wants to play tonight', 'lag cost me the match', 'finally beat the final boss after 40 tries'],
  };
  const PACE = { chill: [420, 900], mix: [180, 420], tx: [30, 60] };   // seconds between mover meme tweets
  const RUNNER_SEC = { chill: [1.0, 1.5], mix: [0.5, 0.85], tx: [0.32, 0.55] };   // seconds per minute of the runner's real chart (tweet plays move very fast; playtester Nov 16, was 1.8-2.6 / 1.0-1.6 / 0.6-1.0)   // seconds per minute of the runner's real chart (fast)

  function J7(game, saved) {
    this.game = game; this.tweets = []; this.seq = 0; this.next = 0; this.nextKol = 0; this.nextNoise = 0; this.evT = 0; this.queue = []; this.wallets = {};
    this.pace = 'mix'; this.real = true; this.noise = 1;
    if (saved) Object.assign(this, saved, { game });
    let seed = (this.rs || (game.sim && game.sim.r ? Math.floor(game.sim.r() * 2147483647) : 7)) >>> 0;
    this._r = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    this._seed = () => seed;
    for (const a of ACCOUNTS) if (a[7] === 'kol' && !this.wallets[a[0]]) this.wallets[a[0]] = 'KOL' + a[0].toUpperCase().slice(0, 4) + Math.floor(this._r() * 1e8).toString(36);
    // real KOLs trade from their real, recently active Solana wallets (public addresses, checked Nov 16, 2026); set after the
    // loop above so the random numbers it draws stay the same
    for (const id in REAL_WALLETS) if (ACCOUNTS.some((x) => x[0] === id)) this.wallets[id] = REAL_WALLETS[id];
    this.syncNames();
  }
  const P = J7.prototype;
  J7.ACCOUNTS = ACCOUNTS; J7.MEMES = MEMES; J7.PACE = PACE; J7.names = {};
  P.save = function () { return { bags: (this.bags || []).slice(-80), tweets: this.tweets.slice(-60), seq: this.seq, next: this.next, nextKol: this.nextKol, nextVoice: this.nextVoice, nextTopic: this.nextTopic, nextGeneral: this.nextGeneral, nextPeople: this.nextPeople, nextGod: this.nextGod, nextNoise: this.nextNoise, evT: this.evT, queue: this.queue, wallets: this.wallets, pace: this.pace, real: this.real, noise: this.noise, rs: this._seed() }; };

  P.acc = function (id) {
    const a = ACCOUNTS.find((x) => x[0] === id); if (!a) return null;
    const real = this.real || !a[3];
    // real people: their real X profile picture, loaded live by handle (unavatar.io) only while real names are on; never stored in the game
    const xp = XPROF[a[2].replace('@', '').toLowerCase()];
    // no verified X picture (wrong or suspended handle): the classic grey default-profile silhouette, like an account that never set one
    const pfpUrl = this.real && a[3] ? (xp ? xp[1] : DEFAULT_PFP) : null;
    return { id: a[0], name: real ? a[1] : a[3], handle: real ? a[2] : a[4], followers: xp && xp[0] > 1000 ? xp[0] : a[5], pfp: a[6], pfpUrl, kind: a[7], power: a[8], verified: a[7] !== 'noise' };
  };
  // the wallet -> account map that chart bubbles read (rebuilt when real/parody names change)
  P.syncNames = function () { J7.names = {}; J7.alias = {}; for (const a of ACCOUNTS) if (this.wallets[a[0]]) J7.names[this.wallets[a[0]]] = this.acc(a[0]); };
  // the market's own KOL caller on a coin is a real KOL account (their wallet, handle and X picture on the chart bubble)
  P.realKol = function (tk) {
    const k = tk && tk.kol; if (!k || k.state !== 'wait' || k.j7) return;
    const kols = ACCOUNTS.filter((a) => a[7] === 'kol' && this.wallets[a[0]]); if (!kols.length) return;
    // picked by the coin's own seed: no draw from J7's random numbers, so the rest of the feed plays out the same
    const a = kols[(tk.seed >>> 0) % kols.length], ac = this.acc(a[0]);
    k.addr = this.wallets[a[0]]; k.handle = String(ac.handle).replace(/^@/, ''); k.j7 = a[0];
    k.sol = Math.max(2, Math.min(5, k.sol || 2));   // J7 KOLs buy in at 2-5 SOL
  };
  // any other KOL wallet on a chart (paid callers, old saves) borrows a real KOL's look, the same one every time
  J7.alias = {};
  J7.kolFor = function (addr) {
    if (!addr) return null; if (J7.names[addr]) return J7.names[addr]; if (J7.alias[addr]) return J7.alias[addr];
    const list = Object.values(J7.names).filter((n) => n.kind === 'kol'); if (!list.length) return null;
    let h = 0; for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
    return (J7.alias[addr] = list[h % list.length]);
  };
  P.setReal = function (v) { J7.alias = {}; this.real = !!v; this.syncNames(); };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  P.post = function (accId, text, extra) {
    const sim = this.game.sim, acc = this.acc(accId); if (!acc) return null;
    const tw = Object.assign({ id: 'j' + (++this.seq), t: sim.t, acc: accId, text }, extra || {});
    this.tweets.push(tw); if (this.tweets.length > 160) this.tweets.splice(0, this.tweets.length - 160);
    // J7 and the old Chirp timeline are one feed now: mirror the tweet as a timeline post so it can be liked, reposted and replied to
    const soc = this.game.sys && this.game.sys.social;
    if (soc && soc.post) { const p = soc.post({ id: 'j7_' + accId, name: acc.name, handle: acc.handle, pfp: acc.pfp, verified: acc.verified, followers: acc.followers }, 'j7', text, { j7: tw.id, j7a: accId, coin: tw.coin || null, meme: tw.meme || null }); if (p) tw.pid = p.id; }
    if (this.game.emit) this.game.emit('j7', tw);
    return tw;
  };

  // ---- a mover tweets a meme: the coin race ----
  P.meme = function (accId) {
    const sim = this.game.sim, r = this._r, acc = this.acc(accId);
    const [line, meme] = MOVER_MEMES[accId] && r() < 0.5 ? pick(r, MOVER_MEMES[accId]) : pick(r, MEMES);
    const tw = this.post(accId, line.replace('{m}', meme), { meme, coins: [], kind: 'meme' });
    const best = BH.Names && BH.Names.ticker ? meme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) : meme.toUpperCase();
    const n = 4 + Math.floor(r() * (4 + 3 * acc.power));
    const fast = this.pace === 'tx';
    const rightAt = Math.floor(r() * Math.min(3, n));   // the right coin lands among the first three
    const wrong = ['ticker', 'pad', 'div', 'ticker', 'pad'];
    for (let i = 0; i < n; i++) {
      const at = sim.t + (fast ? 0.2 + i * (0.25 + r() * 0.5) : 0.4 + i * (0.5 + r() * 1.6));
      this.queue.push({ at, tw: tw.id, meme, best, right: i === rightAt, miss: i === rightAt ? null : pick(r, wrong), power: acc.power });
    }
    // the crowd talks about it a few seconds later
    this.queue.push({ at: sim.t + 6 + r() * 6, tw: tw.id, talk: 'which' });
    // sometimes the mover deletes the tweet a bit later (everything bleeds)
    if (r() < 0.12) this.queue.push({ at: sim.t + 60 + r() * 120, tw: tw.id, del: true });
    // no pop-up: tweets live in J7 only
    return tw;
  };

  // launch one coin of the race
  P.deploy = function (q) {
    const gm = this.game, sim = gm.sim, d = gm.sys.director, r = this._r;
    const tw = this.tweets.find((x) => x.id === q.tw); if (!tw || !d) return null;
    // pick the launchpad before launch (a coin's curve can't change once it has traded)
    const pads = BH.PADS || [], pump = pads.find((p) => p.id === 'pumplab'), other = pads.filter((p) => p.id !== 'pumplab');
    const pad = q.right || q.miss !== 'pad' ? pump : pick(r, other);
    d.force = q.right ? 'mega' : (r() < 0.45 ? 'doa' : r() < 0.6 ? 'rug' : 'pnd');
    const origPick = sim.pickPad; if (pad) sim.pickPad = () => pad;
    // the right coin always plays a fast runner chart: the real $Max chart or the generated Max-style one (never a slow archetype)
    const D = BH.Director, origTpl = D && D.prototype.template;
    // 30% are MEGA runners: the real $Max chart at full size, which goes past $5M; the rest run to roughly $0.5-3M
    const mega = q.right && r() < 0.3;
    if (q.right && origTpl && BH.Mega) D.prototype.template = function (t, rr) { return t === 'mega' ? (mega ? BH.Mega.MAX : BH.Mega.genMega(rr)) : origTpl.call(this, t, rr); };
    let tk;
    try { tk = sim.launch(); } finally { d.force = null; delete sim.pickPad; if (sim.pickPad !== origPick) sim.pickPad = origPick; if (origTpl) D.prototype.template = origTpl; }
    if (!tk) return null;
    const variants = [(w) => w, (w) => 'The ' + w, (w) => w + ' Coin', (w) => 'Baby ' + w, (w) => w + ' CTO', (w) => 'Real ' + w, (w) => w + ' 2.0'];
    const tickers = [(t) => 'THE' + t, (t) => t + 'X', (t) => t.slice(0, Math.max(3, t.length - 1)), (t) => t + 'SOL', (t) => t.toLowerCase(), (t) => t + 'COIN'];
    tk.name = q.right || q.miss !== 'ticker' ? tw.meme : pick(r, variants)(tw.meme);
    tk.ticker = q.right || q.miss !== 'ticker' ? q.best : pick(r, tickers)(q.best).slice(0, 10);
    if (!q.right && q.miss === 'ticker' && tk.ticker === q.best) tk.ticker = ('THE' + q.best).slice(0, 10) === q.best ? q.best.slice(0, 9) + 'Z' : ('THE' + q.best).slice(0, 10);   // a 10-letter ticker plus X cut back to 10 was the right ticker
    tk.realMint = 'j7'; tk.realImg = null; tk.img = Math.abs(hash(tw.meme)) % 200;   // the same meme picture on every copy
    tk.j7 = tw.id; tk.j7Right = !!q.right; tk.narrative = tk.narrative || 'celeb';
    tk.desc = tw.meme + ' (from the tweet)';
    { const ac = this.acc(tw.acc), sid = String(1800000000000000000 + Math.floor(r() * 2e17)); if (tk.dd && ac) { tk.dd.text = pick(r, ['the tweet is live. ticker is the meme. this is the one.', ac.name + ' just tweeted it. ' + tw.meme + ' is the play.', 'fastest deploy on the ' + tw.meme + ' tweet. lfg']); tk.dd.quote = { acc: { name: ac.name, handle: ac.handle, pfp: ac.pfp, pfpUrl: ac.pfpUrl || null, verified: ac.verified, followers: ac.followers }, text: tw.text, t: tw.t, sid }; tk.dd.link = 'x.com/' + ac.handle.replace('@', '') + '/status/' + sid; } }
    tk.rewards = q.right || q.miss !== 'div' ? 'holders' : 'creator';
    if (q.right && tk.dir) {
      // insta bond: the runner plays its real chart fast
      const [a, b] = RUNNER_SEC[this.pace] || RUNNER_SEC.mix;
      tk.dir.sec = a + r() * (b - a); tk.dir.amp = mega ? 1.0 + r() * 0.06 : 0.8 + r() * 0.15;
      tk.j7Mega = mega;
      // KOLs trade the runner (their named bubbles show on the chart): a buy after the bond, some add, most take profit later
      const kols = ACCOUNTS.filter((x) => x[7] === 'kol').sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 4));
      for (const kk of kols) {
        const inAt = sim.t + 6 + r() * (mega ? 50 : 30), size = 2 + r() * 3;   // whale buy-in: 2-5 SOL
        this.queue.push({ at: inAt, kolTrade: kk[0], coin: tk.id, side: 'buy', sol: size, say: r() < 0.5 });
        if (r() < 0.25) this.queue.push({ at: inAt + 8 + r() * 30, kolTrade: kk[0], coin: tk.id, side: 'buy', sol: 2 + r() * 3 });
        if (r() < 0.8) this.queue.push({ at: inAt + 20 + r() * (mega ? 140 : 80), kolTrade: kk[0], coin: tk.id, side: 'sell', frac: 0.3 + r() * 0.7, say: r() < 0.3 });
      }
      // skip the slow crawl: start right before the bond candle (the first 3x+ candle), so it bonds within seconds of landing
      let bi = tk.dir.c.findIndex((k) => k[3] / Math.max(1e-9, k[0]) > 3); if (bi < 0) bi = 0;
      tk.dir.t0 = sim.t + 0.3 - Math.max(0, bi - 0.3) * tk.dir.sec;
      tk.hype = Math.max(tk.hype || 0, 2.5);
      // a tweet play is a frenzy from the first second: constant trades, candles whipping both ways
      tk.dir.fzUntil = sim.t + 90 + r() * 90; tk.dir.fzCool = tk.dir.fzUntil + 300;
    } else if (tk.dir) {
      // look-alikes ride the first seconds of hype, then fade
      tk.dir.sec = Math.max(0.8, tk.dir.sec * 0.4);
      tk.dir.fzUntil = sim.t + 25 + r() * 45; tk.dir.fzCool = tk.dir.fzUntil + 300;   // the copies whip around too, then die
    }
    tw.coins.push(tk.id);
    return tk;
  };

  // ---- KOL posts ----
  P.kolPost = function () {
    const sim = this.game.sim, r = this._r;
    const kols = ACCOUNTS.filter((a) => a[7] === 'kol'), a = pick(r, kols), id = a[0], wallet = this.wallets[id];
    const live = sim.tokens.filter((t) => !t.dead && !t.isPlayer && sim.mc(t) > 20000 && sim.t - t.born < 900).sort((x, y) => sim.vol5m(y) - sim.vol5m(x)).slice(0, 6);
    const held = live.filter((t) => { const h = t.holders.get(wallet); return h && h.tokens > 1; });
    const roll = r();
    if (held.length && roll < 0.2) {
      const tk = pick(r, held), h = tk.holders.get(wallet);
      sim.exec(tk, wallet, 'kol', 'sell', h.tokens * (0.4 + r() * 0.6));
      return this.post(id, pick(r, KOL_LINES.sell).replace('{t}', tk.ticker), { coin: tk.id, kind: 'kol' });
    }
    if (live.length && roll < 0.5) {
      const tk = pick(r, live), sol = 2 + r() * 3;   // KOLs are whales: 2-5 SOL buy-ins
      sim.exec(tk, wallet, 'kol', 'buy', sol);
      // followers pile in over the next seconds
      for (let i = 0; i < 2 + Math.floor(r() * 5 * a[8]); i++) this.queue.push({ at: sim.t + 1 + r() * 8, follow: tk.id, sol: 0.1 + r() * 0.9 });
      if (tk.dir) tk.dir.off = (tk.dir.off || 0) + 0.04 + r() * 0.08 * a[8];
      return this.post(id, pick(r, KOL_LINES.call).replace('{t}', tk.ticker), { coin: tk.id, kind: 'kol' });
    }
    if (roll < 0.88) return this.post(id, pick(r, KOL_LINES.take), { kind: 'kol' });
    return this.post(id, pick(r, KOL_LINES.flex).replace('{x}', (5 + r() * 140).toFixed(1)), { kind: 'kol' });
  };

  // ---- KOLs fight for the first tx (playtester: "most KOLs try to get 1st tx so they can be as profitable as they can be") ----
  // On a fresh launch a KOL may buy 2-5 SOL in the first 0.3-3 s. Much more likely on PvP coins: J7 meme-race copies, vamps,
  // copies of a running ticker, and hot narratives. They then take profit at 1.8-4x (dumping on everyone after them), cut at -50%,
  // or bail after 1-5 min. Most fresh coins die, so plenty of their snipes lose too. That's the trenches.
  P.snipeCheck = function (tk) {
    const gm = this.game, sim = gm.sim, r = this._r, soc = gm.sys.social;
    if (!tk || tk.dead || tk.isPlayer) return;
    // playtester: "KOLs should always appear in any chart": every coin gets at least one KOL entry later on
    { const n = 1 + (r() < 0.35 ? 1 : 0); for (let i = 0; i < n; i++) this.queue.push({ at: sim.t + 6 + r() * (tk.mayhem ? 60 : 150), lateKol: tk.id }); }
    if (tk.mayhem) return;   // no first-tx snipes on Mayhem coins (random bot chop, no edge)
    const heat = soc && soc.heat && tk.narrative ? soc.heat[tk.narrative] || 0 : 0;
    const pvp = tk.j7 || tk.vampOf || (tk.dir && tk.dir.arch === 'I');
    let p = 0.08 + heat / 600 + (tk.j7 ? 0.45 : 0) + (tk.vampOf ? 0.2 : 0) + (tk.dir && tk.dir.arch === 'I' ? 0.15 : 0);
    if (r() > Math.min(0.75, p)) return;
    const kols = ACCOUNTS.filter((x) => x[7] === 'kol'), n = 1 + Math.floor(r() * (pvp ? 3 : 1.6)), used = new Set();
    for (let i = 0; i < n; i++) {
      let k = pick(r, kols); for (let t2 = 0; t2 < 4 && used.has(k[0]); t2++) k = pick(r, kols); if (used.has(k[0])) continue; used.add(k[0]);
      // about half land the first tx; the rest are beaten by bots and buy 5-40 s in, after the first pump
      this.queue.push({ at: sim.t + (r() < 0.5 ? r() * r() * 2.7 : 5 + r() * 35), snipeBuy: k[0], coin: tk.id, sol: 2 + r() * 3 });
    }
  };
  P.kolBagsStep = function () {
    const sim = this.game.sim, r = this._r; this.bags = this.bags || [];
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const b = this.bags[i], tk = sim.byId.get(b.coin), w = this.wallets[b.who], h = tk && w && tk.holders.get(w);
      if (!tk || !h || h.tokens < 1) { this.bags.splice(i, 1); continue; }
      if (tk.dead) { this.bags.splice(i, 1); continue; }
      const x = sim.mc(tk) / b.entry;
      let frac = 0, why = '';
      if (x >= b.tp) { frac = r() < 0.6 ? 1 : 0.6; why = 'tp'; }
      else if (x <= 0.6) { frac = 1; why = "cut"; }
      else if (sim.t >= b.until) { frac = 1; why = 'time'; }
      if (!frac) continue;
      sim.exec(tk, w, 'kol', 'sell', h.tokens * frac);
      if (why === 'tp' && r() < 0.25) this.post(b.who, pick(r, KOL_LINES.sell).replace('{t}', tk.ticker), { coin: tk.id, kind: 'kol' });
      if (frac >= 1) this.bags.splice(i, 1); else { b.tp *= 1.6; b.until = sim.t + 60 + r() * 120; }
    }
  };

  // ---- god candle: a big KOL apes 20-40 SOL into one coin (rare: every ~8-15 min of play) ----
  // playtester: "god candles rarely happen on real charts unless it's a really good narrative, like poorgoat buying 20-40 SOL into a
  // random coin, or the coin I'm in". 30% of the time it's one of your bags; otherwise a live coin, weighted toward hot narratives.
  P.godApe = function (opts) {
    opts = opts || {};
    const gm = this.game, sim = gm.sim, r = this._r, soc = gm.sys.social;
    const live = sim.tokens.filter((t) => !t.dead && !t.isPlayer && sim.mc(t) >= 12000 && sim.mc(t) <= 6e5);
    const mine = live.filter((t) => { const p = gm.player.pos.get(t.id); return p && p.tokens > 1; });
    let tk = opts.coin ? sim.byId.get(opts.coin) : null;
    if (!tk && mine.length && r() < 0.3) tk = pick(r, mine);
    if (!tk && live.length) {
      let tot = 0; const w = live.map((t) => { const h = soc && soc.heat && t.narrative ? soc.heat[t.narrative] || 20 : 20; const x = 1 + h * h / 400; tot += x; return x; });
      let x = r() * tot; for (let i = 0; i < live.length; i++) { if ((x -= w[i]) <= 0) { tk = live[i]; break; } }
      tk = tk || live[live.length - 1];
    }
    if (!tk || tk.dead) return null;
    const kols = ACCOUNTS.filter((a) => a[7] === 'kol');
    const a = opts.who ? ACCOUNTS.find((x) => x[0] === opts.who) : pick(r, kols), wallet = this.wallets[a[0]];
    if (!a || !wallet) return null;
    const sol = opts.sol || 20 + r() * 20, before = sim.mc(tk);
    tk.godUntil = sim.t + 25;
    sim.exec(tk, wallet, 'kol', 'buy', sol);
    const after = sim.mc(tk);
    // the chart script keeps the move (it lingers ~2.5 min) instead of eating it
    if (tk.dir) { tk.dir.off = (tk.dir.off || 0) + Math.log(after / Math.max(1, before)); tk.dir.offHalf = 150; }
    tk.hype = Math.max(tk.hype || 0, 2);
    // chasers pile in over the next ~30 s
    for (let i = 0; i < 10 + Math.floor(r() * 16); i++) this.queue.push({ at: sim.t + 1 + r() * r() * 30, follow: tk.id, sol: 0.2 + r() * 1.8 });
    // most of the time they post it; the rest you only see on the chart (their named bubble) and from the alert bots
    if (r() < 0.6) this.post(a[0], pick(r, ['aped $' + tk.ticker, 'size in $' + tk.ticker, '$' + tk.ticker + ' 🤝', 'loaded $' + tk.ticker + '. let it cook']), { coin: tk.id, kind: 'kol' });
    this.queue.push({ at: sim.t + 4 + r() * 6, god: tk.id, who: a[0], sol });
    const yours = mine.includes(tk);
    // pop-up only when it is your bag; everything else stays in the J7 feed
    if (yours && gm.emit) gm.emit('toast', { kind: 'buy', text: this.acc(a[0]).name + ' just aped ' + sol.toFixed(1) + ' SOL into $' + tk.ticker + ' (your bag!)' });
    return { tk, who: a[0], sol, before, after };
  };

  // ---- alert and news bots: post what really happened ----
  P.alerts = function () {
    const sim = this.game.sim, r = this._r, ev = sim.events || [];
    // the event list is capped at 300, so read by time, not by index
    const fresh = ev.filter((e) => e.t > (this.evT || 0)); if (ev.length) this.evT = ev[ev.length - 1].t;
    let posted = 0;
    for (const e of fresh) {
      if (posted >= 2) break;
      const tk = e.tk || (e.id && sim.byId.get(e.id)) || (e.token && sim.byId.get(e.token)) || null, tick = tk ? '$' + tk.ticker : '';
      if (e.type === 'devsold' && tk && r() < 0.5) { this.post('rugradar', '🚨 Dev of ' + tick + ' sold 100% after ' + Math.max(1, Math.round(sim.t - tk.born)) + ' seconds', { coin: tk.id, kind: 'alert' }); posted++; }
      else if (e.type === 'rug' && tk && r() < 0.35) { this.post('rugradar', tick + ' just rugged. ' + (tk.j7 ? 'a copy from the tweet, as usual' : 'stay safe'), { coin: tk.id, kind: 'alert' }); posted++; }
      else if (e.type === 'migrate' && tk && !tk.j7Bonded && (tk.j7Right || r() < 0.25)) { tk.j7Bonded = true; this.post(r() < 0.4 ? 'solfloor' : 'migalerts', tick + ' bonded in ' + Math.max(1, Math.round(sim.t - tk.born)) + 's' + (tk.j7Right ? ' 🔥' : ''), { coin: tk.id, kind: 'alert' }); posted++; }
    }
    // whale buys and KOL clusters, read from the big runners' recent trades
    if (r() < 0.04) {
      const big = sim.tokens.filter((t) => !t.dead && sim.mc(t) > 150000).sort((a, b) => sim.vol5m(b) - sim.vol5m(a))[0];
      if (big) {
        let w = big.trades.slice(-60).filter((x) => x.side === 'buy' && x.sol >= 15).pop();
        const wk = w && big.id + '@' + w.t; if (wk && wk === this._lastWhale) w = null; else if (wk) this._lastWhale = wk;   // post each whale buy once
        if (w) this.post(r() < 0.6 ? 'whalealert' : 'whalewire', '🐋 A single wallet bought ' + w.sol.toFixed(1) + ' SOL ($' + (w.sol * BH.C.SOL_USD / 1000).toFixed(1) + 'K) of $' + big.ticker, { coin: big.id, kind: 'alert' });
        else {
          const k = Object.values(this.wallets).filter((a) => { const h = big.holders.get(a); return h && h.tokens > 1; }).length;
          this._kolSeen = this._kolSeen || {};
          if (k >= 2 && !(this._kolSeen[big.id] > sim.t - 300) && (this._kolSeen[big.id] = sim.t)) this.post(r() < 0.5 ? 'lookonchain' : 'kolwatch', k + ' tracked KOLs are holding $' + big.ticker, { coin: big.id, kind: 'alert' });
        }
      }
    }
    // SOL moves
    const m = this.game.sys.macro;
    if (m && m.last && m.last.t > (this._solSeen || 0)) { this._solSeen = m.last.t; this.post(pick(r, ['marketsiren', 'watcherguru', 'db', 'degennews']), 'MARKET UPDATE: $SOL ' + (m.last.pct >= 0 ? '+' : '') + m.last.pct.toFixed(1) + '%' + (m.last.text ? '. ' + m.last.text : ''), { kind: 'news' }); }
  };

  P.onStep = function () {
    const gm = this.game, sim = gm.sim, r = this._r;
    if (!this.next) { this.next = sim.t + 20 + r() * 40; this.nextKol = sim.t + 8; this.nextNoise = sim.t + 3; }
    const [lo, hi] = PACE[this.pace] || PACE.mix;
    if (sim.t >= this.next) {
      this.next = sim.t + lo + r() * (hi - lo);
      const movers = ACCOUNTS.filter((a) => a[7] === 'mover');
      let tot = 0; for (const a of movers) tot += a[8];
      let x = r() * tot, who = movers[0]; for (const a of movers) { if ((x -= a[8]) < 0) { who = a; break; } }
      this.meme(who[0]);
    }
    // KOL flow (playtester: "KOLs should also buy in the charts"): the first time a coin passes $25K, 1-3 KOLs may buy 2-5 SOL each,
    // staggered over ~2 min, then take profit or cut a few minutes later. Runners draw them most, rugs and dead coins least.
    if (sim.t - (this._flowT || 0) > 2) {
      this._flowT = sim.t;
      const kols = ACCOUNTS.filter((x) => x[7] === 'kol');
      for (const tk of sim.tokens) {
        if (tk.dead || tk.isPlayer || tk._kolFlow || sim.mc(tk) < 25000) continue;
        tk._kolFlow = true;
        const f = tk.fate2, p = f === 'runner' || f === 'mega' || f === 'legend' ? 0.4 : f === 'pnd' || f === 'whale' ? 0.2 : 0.08;
        if (r() > p) continue;
        const n = 1 + Math.floor(r() * (f === 'runner' || f === 'mega' ? 3 : 2)), used = new Set();
        for (let i = 0; i < n; i++) {
          let k = pick(r, kols); for (let t2 = 0; t2 < 4 && used.has(k[0]); t2++) k = pick(r, kols); if (used.has(k[0])) continue; used.add(k[0]);
          const at = sim.t + 2 + r() * 110;
          this.queue.push({ at, kolTrade: k[0], coin: tk.id, side: 'buy', sol: 2 + r() * 3, say: r() < 0.25 });
          this.queue.push({ at: at + 90 + r() * 330, kolTrade: k[0], coin: tk.id, side: 'sell', frac: r() < 0.6 ? 1 : 0.4 + r() * 0.4, say: r() < 0.15 });
        }
      }
    }
    if (sim.t - (this._bagT || 0) >= 1) { this._bagT = sim.t; this.kolBagsStep(); }
    if (!this.nextGod) this.nextGod = sim.t + 240 + r() * 300;
    if (sim.t >= this.nextGod) { this.nextGod = sim.t + 480 + r() * 420; this.godApe(); }
    if (sim.t >= this.nextKol) { this.nextKol = sim.t + (this.pace === 'tx' ? 8 : 20) + r() * 35; this.kolPost(); }
    if (!this.nextVoice) this.nextVoice = sim.t + 15;
    if (sim.t >= this.nextVoice) { this.nextVoice = sim.t + 25 + r() * 45; const v = ACCOUNTS.filter((a) => a[7] === 'voice'); if (v.length) { const id = pick(r, v)[0]; this.post(id, pick(r, TOPICS[id] || VOICE), { kind: 'voice' }); } }
    // big names tweet about their usual topics now and then (no coins)
    if (!this.nextTopic) this.nextTopic = sim.t + 30;
    if (sim.t >= this.nextTopic) { this.nextTopic = sim.t + 40 + r() * 70; const m = ACCOUNTS.filter((a) => a[7] === 'mover' && TOPICS[a[0]]); if (m.length) { const id = pick(r, m)[0]; this.post(id, pick(r, TOPICS[id]), { kind: 'voice' }); } }
    if (!this.nextGeneral) { this.nextGeneral = sim.t + 8; this.nextPeople = sim.t + 4; }
    if (sim.t >= this.nextGeneral) { this.nextGeneral = sim.t + 25 + r() * 25; const ids = Object.keys(GENERAL), id = pick(r, ids); this.post(id, pick(r, GENERAL[id]), { kind: 'general' }); }
    if (this.noise > 0 && sim.t >= this.nextPeople) { this.nextPeople = sim.t + (10 + r() * 15) / this.noise; const ids = Object.keys(PEOPLE), id = pick(r, ids); this.post(id, pick(r, PEOPLE[id]), { kind: 'people' }); }
    { const w = gm.sys.world, top = w && w.news && w.news[0]; if (top && top.text !== this._lastNews) { if (this._lastNews !== undefined) this.post('dnn', top.text, { kind: 'general' }); this._lastNews = top.text; } }
    if (this.noise > 0 && sim.t >= this.nextNoise) {
      this.nextNoise = sim.t + (12 + r() * 30) / this.noise;
      const ids = Object.keys(NOISE), id = pick(r, ids); this.post(id, pick(r, NOISE[id]), { kind: 'noise' });
    }
    // scheduled deploys, crowd talk, follower buys, deletions
    if (this.queue.length) {
      const due = this.queue.filter((q) => q.at <= sim.t);
      if (due.length) {
        this.queue = this.queue.filter((q) => q.at > sim.t);
        for (const q of due) {
          if (q.kolTrade) {
            const tk = sim.byId.get(q.coin), w = this.wallets[q.kolTrade]; if (!tk || tk.dead || !w) continue;
            if (q.side === 'buy') {
              sim.exec(tk, w, 'kol', 'buy', q.sol);
              if (q.say) this.post(q.kolTrade, pick(r, KOL_LINES.call).replace('{t}', tk.ticker), { coin: tk.id, kind: 'kol' });
            } else {
              const h = tk.holders.get(w); if (!h || h.tokens < 1) continue;
              sim.exec(tk, w, 'kol', 'sell', h.tokens * q.frac);
              if (q.say) this.post(q.kolTrade, pick(r, KOL_LINES.sell).replace('{t}', tk.ticker), { coin: tk.id, kind: 'kol' });
            }
            continue;
          }
          if (q.snipe) { this.snipeCheck(sim.byId.get(q.snipe)); continue; }
          if (q.lateKol) { const tk = sim.byId.get(q.lateKol); if (tk && tk.mayhem && !tk.mayhem.done) { q.at = sim.t + 20; this.queue.push(q); continue; }   // wait out the Mayhem bot (a big buy into a crashed curve would graduate it)
            if (tk && !tk.dead && !tk.rugged) { const kols = ACCOUNTS.filter((x) => x[7] === 'kol'), k = pick(r, kols), w = this.wallets[k[0]]; if (w) { const mc0 = sim.mc(tk); sim.exec(tk, w, 'kol', 'buy', 2 + r() * 3); this.bags = this.bags || []; this.bags.push({ who: k[0], coin: tk.id, entry: mc0, tp: 1.6 + r() * 3, until: sim.t + 45 + r() * 240 }); } } continue; }
          if (q.snipeBuy) { const tk = sim.byId.get(q.coin), w = this.wallets[q.snipeBuy]; if (tk && !tk.dead && w) { const mc0 = sim.mc(tk); sim.exec(tk, w, 'kol', 'buy', q.sol); this.bags = this.bags || []; this.bags.push({ who: q.snipeBuy, coin: tk.id, entry: mc0, tp: 2 + r() * 4, until: sim.t + 60 + r() * 240 }); } continue; }
          if (q.god) { const tk = sim.byId.get(q.god); if (tk) this.post(r() < 0.5 ? 'lookonchain' : 'kolwatch', this.acc(q.who).name + ' bought ' + q.sol.toFixed(1) + ' SOL of $' + tk.ticker + ' in one buy', { coin: tk.id, kind: 'alert' }); continue; }
          if (q.follow) { const tk = sim.byId.get(q.follow); if (tk && !tk.dead) sim.exec(tk, BH.Names.addr(sim.r), 'retail', 'buy', q.sol); continue; }
          const tw = this.tweets.find((x) => x.id === q.tw); if (!tw) continue;
          if (q.del) {
            tw.deleted = true; { const soc = this.game.sys.social, p = soc && tw.pid && soc.posts.find((x) => x.id === tw.pid); if (p) p.deleted = true; }
            for (const id of tw.coins) { const tk = sim.byId.get(id); if (tk && !tk.dead && tk.dir) tk.dir.off = (tk.dir.off || 0) - 0.5; }
            this.post('rugradar', this.acc(tw.acc).name + ' deleted the "' + tw.meme + '" tweet. every $' + tw.meme.toUpperCase().replace(/[^A-Z0-9]/g, '') + ' is bleeding', { kind: 'alert' });
            continue;
          }
          if (q.talk) {
            const k = pick(r, ACCOUNTS.filter((a) => a[7] === 'kol'))[0];
            const n = tw.coins.length;
            const best = tw.meme.toUpperCase().replace(/[^A-Z0-9]/g, '');
            this.post(k, q.talk === 'won' ? 'whoever deployed $' + best + ' first was faster than the bots. respect' : n > 2 ? n + ' coins on ' + tw.meme + ' already. which one is the real one' : 'is anyone on the ' + tw.meme + ' tweet', { kind: 'kol', quote: tw.id });
            continue;
          }
          this.deploy(q);
        }
      }
    }
    if (sim.t - (this._alertT || 0) > 1) { this._alertT = sim.t; this.alerts(); }
  };
  P.afterTime = function () { };

  // the coins launched off a tweet, live ones first by market cap
  P.coinsOf = function (tw) {
    const sim = this.game.sim;
    return (tw.coins || []).map((id) => sim.byId.get(id)).filter(Boolean).sort((a, b) => (a.dead - b.dead) || sim.mc(b) - sim.mc(a));
  };

  // you deployed a coin: if it matches a fresh meme tweet, you're in the race.
  // Right setup (best ticker, Pump, Dividends) before the bots land theirs = the snipers and the crowd buy yours.
  P.onLaunchMine = function (tk) {
    const sim = this.game.sim, r = this._r;
    const tw = this.tweets.slice().reverse().find((x) => x.kind === 'meme' && !x.deleted && sim.t - x.t < 45 && norm(tk.name) .includes(norm(x.meme)));
    if (!tw) return null;
    const best = tw.meme.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const right = tk.ticker === best && tk.lp === 'pumplab' && tk.rewards === 'holders';
    const pending = this.queue.find((q) => q.tw === tw.id && q.right);
    tk.j7 = tw.id; tw.coins.push(tk.id); tw.mine = tk.id;
    if (right && pending) {
      // you beat the bots: their "right" coin lands with a wrong setting instead, and the snipers pile into yours
      pending.right = false; pending.miss = 'ticker';
      tk.j7Right = true; tw.won = true;
      tk.hype = Math.max(tk.hype, 5 + r() * 3); tk.half = Math.max(tk.half, 45);
      const n = 12 + Math.floor(r() * 9);
      for (let i = 0; i < n; i++) tk.snipers.push({ addr: BH.Names.addr(sim.r), at: sim.t + 0.1 + r() * 1.5, sol: 0.5 + r() * 2.5, tp: 2 + r() * 4, done: false });
      if (this.game.emit) this.game.emit('toast', { kind: 'buy', text: 'You landed $' + tk.ticker + ' first. The snipers are buying yours.' });
      this.queue.push({ at: sim.t + 4 + r() * 4, tw: tw.id, talk: 'won' });
      return 'won';
    }
    // late or wrong: you get a vamp's share of the attention
    tk.hype = Math.max(tk.hype, right ? 1.6 : 0.9); tk.half = Math.max(tk.half, 20);
    if (this.game.emit) this.game.emit('toast', { kind: 'info', text: right ? 'Right setup, but the bots landed first. Yours is a vamp now.' : 'Deployed $' + tk.ticker + ', but the setup is off (best is $' + best + ' on Pump with Dividends).' });
    return right ? 'late' : 'wrong';
  };
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

  BH.J7 = J7;
  BH.Systems = BH.Systems || [];
  // tweet plays (playtester, Nov 16): for the first ~3 minutes a crowd hammers the right coin: big apes, panic sells, fast wicks
  // both ways, the way insta-bond coins off a tweet trade. Its own random numbers (from the coin's seed), so the rest of J7
  // plays out the same. Most of the push is up early and fades into chop.
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  P.tweetChop = function () {
    const sim = this.game.sim, now = sim.t;
    for (const tk of sim.tokens) {
      if (!tk.j7Right || tk.dead || tk.rugged) continue;
      const age = now - tk.born; if (age > 190) continue;
      const st = tk.chop || (tk.chop = { r: null, n: 0, last: now, w: [] }); const rr = st.r || (st.r = mulberry((tk.seed || 1) * 7919 + st.n));
      const dt = Math.min(1, now - st.last); st.last = now; if (dt <= 0) continue;
      const heat = age < 25 ? 1 : age < 90 ? 0.75 : 0.45, n = rr() < 3.2 * dt * heat ? 1 + Math.floor(rr() * 3) : 0;
      for (let i = 0; i < n; i++) {
        st.n++;
        let addr = ''; for (let k = 0; k < 44; k++) addr += CHARS[Math.floor(rr() * CHARS.length)];
        const buyBias = age < 25 ? 0.52 : age < 90 ? 0.48 : 0.44, pool = tk.stage === 'curve' ? tk.realSol + 30 : tk.poolSol, size = Math.min(60, Math.max(0.2, pool * 0.009 * Math.exp((rr() + rr() + rr() - 1.5) * 1.5) * (rr() < 0.1 ? 3.5 : 1)));   // sized to the pool: one ape or dump moves it a few %, a big one 10%+
        // sells only come from the crowd's own bags (never the dev's, the whales' or the KOLs' wallets)
        const live = st.w.filter((w) => { const h = tk.holders.get(w); return h && h.tokens > 1; });
        if (!live.length && st.n > 6 && rr() > buyBias) continue;
        if (rr() < buyBias || !live.length) { if (sim.exec(tk, addr, 'retail', 'buy', size)) { st.w.push(addr); if (st.w.length > 60) st.w.shift(); } }
        else { const w = live[Math.floor(rr() * live.length)], h = tk.holders.get(w); const px = sim.price(tk); sim.exec(tk, w, 'retail', 'sell', px > 0 ? Math.min(h.tokens, size * (0.8 + rr() * 0.6) / px) : h.tokens); }   // a dump is about as big as an ape
      }
    }
  };
  BH.Systems.push({ name: 'j7', create(game, saved) { const j = new J7(game, saved); j.hooks = { step: () => { j.onStep(); j.tweetChop(); }, launchMine: (tk) => j.onLaunchMine(tk), launch: (tk) => { j.realKol(tk); j.queue.push({ at: game.sim.t + 0.3, snipe: tk.id }); } }; return j; } });
})(typeof window !== 'undefined' ? window : globalThis);
