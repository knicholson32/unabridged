
```
mkdir /home/Books
audible quickstart
audible download -a B01N48VJFJ -o /home/Books --aax --cover --cover-size 1215 --chapter
audible library export -o /home/library.tsv
audible activation-bytes

 --ffmpeg-path /usr/bin/ 
AAXtoMP3 -e:m4b -s -D '$title \($narrator\)' -t /audiobooks-exports /home/Books/*.aax



1774241978: Brandon Q. Morris: Proxima Trilogy: Proxima Rising


audible -P haley download -a 1982592575 -o /home/downloads --aaxc --cover --cover-size 1215 --chapter


audible -P haley download -a B004NQKRVE -o /home/downloads --aaxc --cover --cover-size 1215 --chapter 2>&1 | tee -a logfile

AAXtoMP3 -e:m4b -s --file-naming-scheme '$title' --dir-naming-scheme '$artist/$title' --use-audible-cli-data -t /home/processing /home/downloads/*.aaxc

<!-- beet import /home/processing -->


rm -rf /home/downloads/*
rm -rf /home/processing/*

```

```
audible quickstart
audible -P haley download -a B004NQKRVE -o /home/downloads --aaxc --cover --cover-size 1215 --chapter
AAXtoMP3 -e:m4b -s --file-naming-scheme '$title' --dir-naming-scheme '$artist/$title' --use-audible-cli-data -t /home/Books /home/downloads/*.aaxc

```


Haley:
B002UP1LXS: Robert Jordan: Wheel of Time: The Great Hunt
B002UZML5K: Robert Jordan: Wheel of Time: The Shadow Rising
B002UZN0PA: Brandon Sanderson, Robert Jordan: Wheel of Time: The Gathering Storm
B002V0118W: Robert Jordan: Wheel of Time: A Crown of Swords
B002V0JU3U: Robert Jordan: Wheel of Time: The Fires of Heaven
B002V0K6BA: Robert Jordan: Wheel of Time: Knife of Dreams
B002V1AJEI: Robert Jordan: Wheel of Time: Path of Daggers
B002V1OIM2: Robert Jordan: Wheel of Time: The Dragon Reborn
B002V5BDOE: Robert Jordan: Wheel of Time: Lord of Chaos
B0036N9G8K: Robert Jordan: Wheel of Time: Crossroads of Twilight
B0036NHZ10: Robert Jordan: Wheel of Time: The Eye of the World
B00494LMV4: Brandon Sanderson, Robert Jordan: Wheel of Time: Towers of Midnight
B004NQKRVE: Robert Jordan: Wheel of Time: Winter's Heart
B009OJXEOW: Brandon Sanderson, Robert Jordan: Wheel of Time: A Memory of Light


Elizabeth:

1774241978: Brandon Q. Morris: Proxima Trilogy: Proxima Rising
1774241986: Brandon Q. Morris: Proxima Trilogy: Proxima Dying
1774241994: Brandon Q. Morris: Proxima Trilogy: Proxima Dreaming
B002VA9CAQ: John Scalzi: Old Man's War: The Last Colony
B004DR2CNE: John Scalzi: Agent to the Stars
B004FGDVUG: John Scalzi: The Android's Dream
B004YXLK7G: John Scalzi: Fuzzy Sapiens: Fuzzy Nation
B007SP2LPM: John Scalzi: Redshirts
B00KYUYM14: John Scalzi: Lock In Series: Lock In (Narrated by Wil Wheaton)
B00J47K6XG: Jodi Taylor: The Chronicles of St Mary's: Just One Damned Thing After Another
B00JENLJU4: Jodi Taylor: The Chronicles of St Mary's: A Symphony of Echoes
B00MG2ML2A: Jodi Taylor: The Chronicles of St Mary's: A Second Chance
B00OS5TZ2M: Jodi Taylor: The Chronicles of St Mary's: A Trail Through Time
B00V5HAUGQ: Jodi Taylor: The Chronicles of St Mary's: When a Child Is Born
B00V5HBW1S: Jodi Taylor: The Chronicles of St Mary's: Roman Holiday
B00V5HC6JA: Jodi Taylor: The Chronicles of St Mary's: Christmas Present
B00VMD840W: Jodi Taylor: The Chronicles of St Mary's: No Time Like the Past
B00YYVUQGY: Jodi Taylor: The Chronicles of St Mary's: What Could Possibly Go Wrong?
B015RJKT9A: Jodi Taylor: The Chronicles of St Mary's: The Very First Damned Thing
B016E9I1Y2: Jodi Taylor: The Chronicles of St Mary's: Ships and Stings and Wedding Rings

177424344X: Joshua Dalzelle: The Unification War Trilogy: Battleground
B00W8DA84U: Joshua Dalzelle: Black Fleet Trilogy: Warship
B01AGMIFIU: Joshua Dalzelle: Black Fleet Trilogy: Call to Arms
B01GU941JU: Joshua Dalzelle: Black Fleet Trilogy: Counterstrike
B06XR59MLQ: Joshua Dalzelle: The Expansion Wars Trilogy: New Frontiers
B072QFWDWL: Joshua Dalzelle: The Expansion Wars Trilogy: Iron & Blood
B078P2HC19: Joshua Dalzelle: The Expansion Wars Trilogy: Destroyer
B07DX87JRV: Joshua Dalzelle: Blueshift
B09LRM3SFN: Joshua Dalzelle: The Unification War Trilogy: No Quarter
B09V98WX2B: Joshua Dalzelle: The Unification War Trilogy: Empire

B002UZI27Q: Charles Sheffield: The Heritage Universe: Convergence
B002UZMY52: Charles Sheffield: The Heritage Universe: Divergence
B002V8MEK8: Charles Sheffield: The Heritage Universe: Transcendence
B002VA8NC4: Charles Sheffield: The Heritage Universe: Summertide

1039404693: B.V. Larson: Undying Mercenaries: Green World
1774247674: B. V. Larson: Undying Mercenaries: Edge World
B00GBC0GB4: B. V. Larson: Undying Mercenaries: Steel World
B00JEKVZKQ: B. V. Larson: Undying Mercenaries: Dust World
B00NVOJYYU: B. V. Larson: Undying Mercenaries: Tech World
B00U2S776K: B. V. Larson: Undying Mercenaries: Machine World
B00YT8AV8A: B. V. Larson: Undying Mercenaries: Death World
B01E9FHNEM: B. V. Larson: Undying Mercenaries: Home World
B071WWW2DD: B. V. Larson: Undying Mercenaries: Rogue World
B07954K6LN: B. V. Larson: Undying Mercenaries: Blood World
B07DF79K2D: B. V. Larson: Undying Mercenaries: Dark World
B07L1694R1: B. V. Larson: Undying Mercenaries: Storm World
B084SV1HFQ: B. V. Larson: Undying Mercenaries: Glass World
B09V1XY6DR: B.V. Larson: Undying Mercenaries: City World