# OSRM route geometry QA

Generated 2026-09-26T10:40:32.986Z by scripts/ingest-gtfs.mjs from `mumbai_metropolitan_routes.geojson`.

- Road-snapped route/direction lines: **885**
- Lines needing repair: **209** (420 stop-to-stop legs)
- Rule: leg > 2 km longer and > 3× the straight distance between consecutive stops. The detour is replaced by a straight connector in the app.
- BEST routes with no geometry are routes with zero trips in the feed (nothing to draw).

Likely causes: stop snapped to the wrong carriageway / flyover level, or the OSRM car profile forbidding a turn or
one-way movement that buses make. Fixing these in the pipeline (bus profile, snapping radius, or per-stop bearing
hints) will make the repairs unnecessary — re-run this script with the new file.

| Route | Dir | From stop | To stop | Straight km | OSRM km |
|---|---|---|---|---|---|
| 60 (60-2) | 1 | Sewree Station (E) | Gadi Adda | 0.35 | 37.69 |
| 45AS (45AS) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 49AS (49AS) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 10AS (10AS) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 26AS (26AS) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 59AS (59AS) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 6LTD (6LTD-1) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 6LTD (6LTD-2) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 60 (60-2) | 1 | Adarsh High School (Anik) | Shanti Nagar (Wadala-E) | 0.23 | 17.95 |
| 53AS (53AS) | 1 | Kalamboli Fire Brigade | Mahatma Gandhi Hospital; Panvel Naka | 0.82 | 17.67 |
| 357AS (357AS) | 0 | Samrat Ashok Nagar (Deonar) | Gautam Nagar; Deonar Abattoir | 0.51 | 9.94 |
| 375AS (375AS) | 1 | Samrat Ashok Nagar (Deonar) | Gautam Nagar; Deonar Abattoir | 0.51 | 9.94 |
| 376AS (376AS) | 1 | Samrat Ashok Nagar (Deonar) | Gautam Nagar; Deonar Abattoir | 0.51 | 9.94 |
| 383AS (383AS) | 0 | Samrat Ashok Nagar (Deonar) | Gautam Nagar; Deonar Abattoir | 0.51 | 9.94 |
| 8AS (8AS) | 0 | Samrat Ashok Nagar (Deonar) | Gautam Nagar; Deonar Abattoir | 0.51 | 9.94 |
| 19AS (19AS) | 0 | Samrat Ashok Nagar (Deonar) | Mhada Colony (Shivaji Nagar) | 0.96 | 10.35 |
| 502AS (502AS) | 1 | Samrat Ashok Nagar (Deonar) | Mhada Colony (Shivaji Nagar) | 0.96 | 10.35 |
| 504AS (504AS) | 1 | Samrat Ashok Nagar (Deonar) | Mhada Colony (Shivaji Nagar) | 0.96 | 10.35 |
| 318AS (318AS) | 0 | Vidya Nagari (Kalina) | Health Centre (Vidyanagari) | 0.1 | 9.25 |
| 108AS (108AS) | 1 | Balbhavan | Taraporewala Aquarium | 0.3 | 8.87 |
| 123AS (123AS) | 1 | Balbhavan | Taraporewala Aquarium | 0.3 | 8.87 |
| 887null (887null) | 0 | Balbhavan | Taraporewala Aquarium | 0.3 | 8.87 |
| 84AS (84AS) | 1 | Domestic Cruise Terminal | Gymkhana | 2.78 | 10.83 |
| 62AS (62AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 86AS (86AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 125AS (125AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 151 (151-2) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 28 (28-6) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 37AS (37AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 305C (305C) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 357AS (357AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 57 (57-4) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 83 (83-2) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 85AS (85AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 86C (86C) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 88 (88-2) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 89AS (89AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Lala Lajpatrai College | 0.32 | 7.39 |
| 181 (181) | 1 | Nafa | Amar Brass & Steel Company | 0.29 | 6.83 |
| 37AS (37AS) | 0 | Nafa | Amar Brass & Steel Company | 0.29 | 6.83 |
| 312 (312-1) | 1 | Nafa | Amar Brass & Steel Company | 0.29 | 6.83 |
| 313AS (313AS) | 1 | Nafa | Amar Brass & Steel Company | 0.29 | 6.83 |
| 318AS (318AS) | 1 | Nafa | Amar Brass & Steel Company | 0.29 | 6.83 |
| 507AS (507AS) | 0 | Nafa | Amar Brass & Steel Company | 0.29 | 6.83 |
| 371AS (371AS) | 1 | Mohammad Estate | Kapadia Nagar | 0.24 | 6.73 |
| 55C (55C) | 0 | Mohammad Estate | Kapadia Nagar | 0.24 | 6.73 |
| 55C (55C) | 1 | C.B.D. Belapur Bus Station | C.B.D.Belapur; Konkan Bhavan | 0.22 | 6.38 |
| 504AS (504AS) | 1 | C.B.D. Belapur Bus Station | C.B.D.Belapur; Konkan Bhavan | 0.22 | 6.38 |
| 505C (505C) | 1 | C.B.D. Belapur Bus Station | C.B.D.Belapur; Konkan Bhavan | 0.22 | 6.38 |
| 526LTD (526LTD) | 1 | C.B.D. Belapur Bus Station | C.B.D.Belapur; Konkan Bhavan | 0.22 | 6.38 |
| 108AS (108AS) | 0 | Taraporewala Aquarium | Balbhavan | 0.41 | 6.31 |
| 123AS (123AS) | 0 | Taraporewala Aquarium | Balbhavan | 0.41 | 6.31 |
| 887null (887null) | 0 | Taraporewala Aquarium | Balbhavan | 0.41 | 6.31 |
| 60 (60-2) | 1 | Sewree Railway Phatak | Sewree Station (E) | 0.33 | 6.09 |
| 3AS (3AS) | 0 | Jijamata Udyan (Byculla) | Robert Gomes Chowk (Byculla-E) | 0.21 | 5.75 |
| 50 (50-2) | 0 | Jijamata Udyan (Byculla) | Robert Gomes Chowk (Byculla-E) | 0.21 | 5.75 |
| 308 (308-1) | 0 | Ekta Society | Sahar Police Station | 0.52 | 6 |
| 180AS (180AS) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 35AS (35AS) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 35AS (35AS) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 308 (308-1) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 321LTD (321LTD) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 321LTD (321LTD) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 331AS (331AS) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 331AS (331AS) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 337 (337-2) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 365AS (365AS) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 365AS (365AS) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 382LTD (382LTD) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 382LTD (382LTD) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 409AS (409AS) | 1 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 409AS (409AS) | 0 | Ambassador Hotel (Sahar) | Sahar Police Station | 0.23 | 5.67 |
| 305C (305C) | 1 | Nehru Planetarium; N.S.C.I (Worli) | Vatsalabai Desai Chowk (Haji Ali) | 0.81 | 6.17 |
| 87LTD (87LTD-2) | 1 | Nehru Planetarium; N.S.C.I (Worli) | Vatsalabai Desai Chowk (Haji Ali) | 0.81 | 6.17 |
| 92AS (92AS) | 1 | Nehru Planetarium; N.S.C.I (Worli) | Vatsalabai Desai Chowk (Haji Ali) | 0.81 | 6.17 |
| 125AS (125AS) | 1 | Lala Lajpatrai Collage | Vatsalabai Desai Chowk (Haji Ali) | 0.34 | 5.61 |
| 357AS (357AS) | 1 | Lala Lajpatrai Collage | Vatsalabai Desai Chowk (Haji Ali) | 0.34 | 5.61 |
| 85AS (85AS) | 1 | Lala Lajpatrai Collage | Vatsalabai Desai Chowk (Haji Ali) | 0.34 | 5.61 |
| 88 (88-2) | 1 | Lala Lajpatrai Collage | Vatsalabai Desai Chowk (Haji Ali) | 0.34 | 5.61 |
| 1AS (1AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 11LTD (11LTD) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 15 (15-3) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 19AS (19AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 134AS (134AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 21AS (21AS-2) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 22AS (22AS-2) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 25AS (25AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 4AS (4AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 5AS (5AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 51 (51-6) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 526LTD (526LTD) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 526AS (526AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 6LTD (6LTD-1) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 6LTD (6LTD-2) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 69 (69-2) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 7AS (7AS-1) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 8AS (8AS) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 9 (9-3) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.5 | 5.46 |
| 181 (181) | 0 | Amar Brass & Steel Company | Nafa | 0.32 | 5.25 |
| 37AS (37AS) | 1 | Amar Brass & Steel Company | Nafa | 0.32 | 5.25 |
| 312 (312-1) | 0 | Amar Brass & Steel Company | Nafa | 0.32 | 5.25 |
| 313AS (313AS) | 0 | Amar Brass & Steel Company | Nafa | 0.32 | 5.25 |
| 318AS (318AS) | 0 | Amar Brass & Steel Company | Nafa | 0.32 | 5.25 |
| 507AS (507AS) | 1 | Amar Brass & Steel Company | Nafa | 0.32 | 5.25 |
| 67 (67-5) | 0 | Jijamata Udyan (Byculla) | Jaihind Cinema | 0.42 | 5.35 |
| 700AS (700AS) | 0 | Kashi Village | Western Hotel; Laxmi Baug | 0.41 | 5.32 |
| 702AS (702AS) | 0 | Kashi Village | Western Hotel; Laxmi Baug | 0.41 | 5.32 |
| 92AS (92AS) | 0 | Air Condition Market | Vatsalabai Desai Chowk (Haji Ali) | 0.77 | 5.64 |
| 125AS (125AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Vatsalabai Desai Chowk (Haji Ali) | 0.42 | 5.24 |
| 357AS (357AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Vatsalabai Desai Chowk (Haji Ali) | 0.42 | 5.24 |
| 85AS (85AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Vatsalabai Desai Chowk (Haji Ali) | 0.42 | 5.24 |
| 87LTD (87LTD-2) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Vatsalabai Desai Chowk (Haji Ali) | 0.42 | 5.24 |
| 37AS (37AS) | 0 | Amar Brass & Steel Company | Metro Playing Cards | 0.45 | 5.11 |
| 313AS (313AS) | 1 | Amar Brass & Steel Company | Metro Playing Cards | 0.45 | 5.11 |
| 318AS (318AS) | 1 | Amar Brass & Steel Company | Metro Playing Cards | 0.45 | 5.11 |
| 507AS (507AS) | 0 | Amar Brass & Steel Company | Metro Playing Cards | 0.45 | 5.11 |
| 181 (181) | 1 | Amar Brass & Steel Company | Metro Playing Cards | 0.39 | 5.04 |
| 312 (312-1) | 1 | Amar Brass & Steel Company | Metro Playing Cards | 0.39 | 5.04 |
| 525LTD (525LTD) | 0 | Bhandup Pumping Centre | Airoli Toll Naka | 0.85 | 5.42 |
| 545LTD (545LTD) | 0 | Bhandup Pumping Centre | Airoli Toll Naka | 0.85 | 5.42 |
| 180AS (180AS) | 1 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 35AS (35AS) | 0 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 308 (308-1) | 1 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 321LTD (321LTD) | 0 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 331AS (331AS) | 1 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 337 (337-2) | 0 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 365AS (365AS) | 1 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 382LTD (382LTD) | 1 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 409AS (409AS) | 1 | Warehouse (Sahar) | Indian Oil (Sahar) | 0.45 | 5.01 |
| 54C (54C) | 0 | Airoli Octroi Naka | Airoli Toll Naka | 0.86 | 5.41 |
| 512LTD (512LTD) | 0 | Airoli Octroi Naka | Airoli Toll Naka | 0.86 | 5.41 |
| 513C (513C) | 0 | Airoli Octroi Naka | Airoli Toll Naka | 0.86 | 5.41 |
| 523LTD (523LTD-2) | 0 | Airoli Octroi Naka | Airoli Toll Naka | 0.86 | 5.41 |
| 37AS (37AS) | 0 | Metro Playing Cards | Kapadia Nagar | 0.36 | 4.87 |
| 313AS (313AS) | 1 | Metro Playing Cards | Kapadia Nagar | 0.36 | 4.87 |
| 318AS (318AS) | 1 | Metro Playing Cards | Kapadia Nagar | 0.36 | 4.87 |
| 507AS (507AS) | 0 | Metro Playing Cards | Kapadia Nagar | 0.36 | 4.87 |
| 40C (40C) | 1 | Darpan Cinema; Sai Service | Gundavali; Lion S Club | 0.73 | 5.2 |
| 440C (440C) | 1 | Darpan Cinema; Sai Service | Gundavali; Lion S Club | 0.73 | 5.2 |
| 30AS (30AS) | 1 | Asha Usha Company | Vikhroli Station Road (E) | 0.86 | 5.2 |
| 151 (151-2) | 0 | Mahalaxmi Temple | Vatsalabai Desai Chowk (Haji Ali) | 0.58 | 4.82 |
| 37AS (37AS) | 0 | Mahalaxmi Temple | Vatsalabai Desai Chowk (Haji Ali) | 0.58 | 4.82 |
| 62AS (62AS) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 86AS (86AS) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 28 (28-6) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 305C (305C) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 57 (57-4) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 83 (83-2) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 86C (86C) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 88 (88-2) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 89AS (89AS) | 0 | Jaslok Hospital | Vatsalabai Desai Chowk (Haji Ali) | 0.78 | 5.01 |
| 27 (27-2) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 30AS (30AS) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 354AS (354AS) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 368LTD (368LTD) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 371AS (371AS) | 0 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 373AS (373AS) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 382LTD (382LTD) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 54C (54C) | 1 | Jijamata Bhosle Marg Junction (Chembur) | Chheda Nagar | 0.17 | 4.04 |
| 181 (181) | 0 | Nafa | Vidya Nagari (Kalina) | 0.29 | 4.07 |
| 37AS (37AS) | 1 | Nafa | Vidya Nagari (Kalina) | 0.29 | 4.07 |
| 312 (312-1) | 0 | Nafa | Vidya Nagari (Kalina) | 0.29 | 4.07 |
| 313AS (313AS) | 0 | Nafa | Vidya Nagari (Kalina) | 0.29 | 4.07 |
| 318AS (318AS) | 0 | Nafa | Vidya Nagari (Kalina) | 0.29 | 4.07 |
| 507AS (507AS) | 1 | Nafa | Vidya Nagari (Kalina) | 0.29 | 4.07 |
| 181 (181) | 0 | Mohammad Estate | Metro Playing Cards | 0.13 | 3.87 |
| 312 (312-1) | 0 | Mohammad Estate | Metro Playing Cards | 0.13 | 3.87 |
| 354AS (354AS) | 1 | Vikhroli Station Road (E) | Vikhroli Station Road (E) | 0.14 | 3.86 |
| 329AS (329AS) | 1 | Railway Police Ground (Ghatkopar-E) | Ramabai Nagar (Ghatkopar-E) | 0.2 | 3.85 |
| 453AS (453AS) | 1 | Vikhroli Station Road (E) | Vikhroli Station Road (E) | 0.1 | 3.75 |
| 492AS (492AS) | 1 | Kanjur Marg Village (Eeh) | Jogeshwari Vikhroli Link Road (Kanjurmarg-E) | 0.77 | 4.41 |
| 525LTD (525LTD) | 1 | Kanjur Marg Village (Eeh) | Jogeshwari Vikhroli Link Road (Kanjurmarg-E) | 0.77 | 4.41 |
| 404AS (404AS) | 0 | Raliway Police Ground | Ramabai Nagar (Ghatkopar-E) | 0.21 | 3.83 |
| 324 (324-1) | 0 | Sanjay Nagar (Jogeshwari-E) | Jogeshwari (E) Police Station | 0.15 | 3.75 |
| 428 (428) | 1 | Sanjay Nagar (Jogeshwari-E) | Jogeshwari (E) Police Station | 0.15 | 3.75 |
| 442 (442) | 0 | Sanjay Nagar (Jogeshwari-E) | Jogeshwari (E) Police Station | 0.15 | 3.75 |
| 1AS (1AS) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 200AS (200AS) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 212 (212-2) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 4AS (4AS) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 40C (40C) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 46 (46-2) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 440C (440C) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 51 (51-6) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 54C (54C) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 85AS (85AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 92AS (92AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.83 | 4.41 |
| 164AS (164AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 30AS (30AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 305C (305C) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 351AS (351AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 354AS (354AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 357AS (357AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 385AS (385AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 5AS (5AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 66 (66-2) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 85AS (85AS) | 0 | Ruia College (Matunga-E) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.3 | 3.84 |
| 53AS (53AS) | 1 | Gharkul | Kopara Village | 0.6 | 3.96 |
| 181 (181) | 1 | Vidya Nagari (Kalina) | Nafa | 0.3 | 3.43 |
| 37AS (37AS) | 0 | Vidya Nagari (Kalina) | Nafa | 0.3 | 3.43 |
| 312 (312-1) | 1 | Vidya Nagari (Kalina) | Nafa | 0.3 | 3.43 |
| 313AS (313AS) | 1 | Vidya Nagari (Kalina) | Nafa | 0.3 | 3.43 |
| 318AS (318AS) | 1 | Vidya Nagari (Kalina) | Nafa | 0.3 | 3.43 |
| 507AS (507AS) | 0 | Vidya Nagari (Kalina) | Nafa | 0.3 | 3.43 |
| 108AS (108AS) | 0 | Balbhavan | Birla Krida Kendra | 0.44 | 3.46 |
| 123AS (123AS) | 0 | Balbhavan | Birla Krida Kendra | 0.44 | 3.46 |
| 887null (887null) | 0 | Balbhavan | Birla Krida Kendra | 0.44 | 3.46 |
| 61C (61C) | 1 | Kashimira | Western Hotel; Laxmi Baug | 0.74 | 3.76 |
| 181 (181) | 0 | Vidya Nagari (Kalina) | Kapilvastu Buddha Vihar (Kalina) | 0.25 | 3.26 |
| 37AS (37AS) | 1 | Vidya Nagari (Kalina) | Kapilvastu Buddha Vihar (Kalina) | 0.25 | 3.26 |
| 312 (312-1) | 0 | Vidya Nagari (Kalina) | Kapilvastu Buddha Vihar (Kalina) | 0.25 | 3.26 |
| 313AS (313AS) | 0 | Vidya Nagari (Kalina) | Kapilvastu Buddha Vihar (Kalina) | 0.25 | 3.26 |
| 507AS (507AS) | 1 | Vidya Nagari (Kalina) | Kapilvastu Buddha Vihar (Kalina) | 0.25 | 3.26 |
| 355LTD (355LTD) | 0 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 356AS (356AS) | 0 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 374 (374) | 0 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 375AS (375AS) | 0 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 473AS (473AS) | 1 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 55C (55C) | 1 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 505C (505C) | 1 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.05 | 3.98 |
| 215AS (215AS) | 1 | Kala Nagar (Bandra-E) Mhada Office | Padmashree Mohammed Rafi Chowk; Bandra (W) | 1.07 | 3.91 |
| 411 (411) | 0 | Don Bosco; Khalsa College | Maheshwari Udyan (Kings Circle) | 0.44 | 3.27 |
| 371AS (371AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.33 | 3.15 |
| 19AS (19AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 329AS (329AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 350AS (350AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 404AS (404AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 458AS (458AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 488AS (488AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 489LTD (489LTD) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 493AS (493AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 53AS (53AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 502AS (502AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 504AS (504AS) | 1 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 507AS (507AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 517AS (517AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 533AS (533AS) | 0 | Mhada Colony (Shivaji Nagar) | Shivaji Nagar Junction (Govandi) | 0.31 | 3.07 |
| 507AS (507AS) | 1 | P.W.D. Ground (Chembur) | Jijamata Bhosle Marg Junction (Chembur) | 0.46 | 3.2 |
| 55C (55C) | 1 | Kapadia Nagar | BKC Telephone Exchange | 0.52 | 3.25 |
| 10AS (10AS) | 1 | Adarsh High School (Anik) | Adarsh High School (Anik) | 0.28 | 3 |
| 11LTD (11LTD) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 19AS (19AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 21AS (21AS-2) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 22AS (22AS-2) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 25AS (25AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 29LTD (29LTD) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 30AS (30AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 305C (305C) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 351AS (351AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 354AS (354AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 357AS (357AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 368LTD (368LTD) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 385AS (385AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 5AS (5AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 59AS (59AS) | 1 | Adarsh High School (Anik) | Adarsh High School (Anik) | 0.28 | 3 |
| 521C (521C) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 526LTD (526LTD) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 526AS (526AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 6LTD (6LTD-1) | 1 | Adarsh High School (Anik) | Adarsh High School (Anik) | 0.28 | 3 |
| 6LTD (6LTD-2) | 1 | Adarsh High School (Anik) | Adarsh High School (Anik) | 0.28 | 3 |
| 60 (60-2) | 1 | Adarsh High School (Anik) | Adarsh High School (Anik) | 0.28 | 3 |
| 66 (66-2) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 7AS (7AS-1) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 7AS (7AS-2) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 8AS (8AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 85AS (85AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 92AS (92AS) | 1 | Maheshwari Udyan (Kings Circle) | Jagatdev N.Varma Chowk; Kapole Niwas | 0.43 | 3.15 |
| 62AS (62AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 86AS (86AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 125AS (125AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 151 (151-2) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 28 (28-6) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 37AS (37AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 305C (305C) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 357AS (357AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 57 (57-4) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 83 (83-2) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 85AS (85AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 86C (86C) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 88 (88-2) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 89AS (89AS) | 0 | Lala Lajpatrai College | Nehru Planetarium (Worli) | 0.69 | 3.38 |
| 371AS (371AS) | 0 | Jijamata Bhosle Marg Junction (Chembur) | Jijamata Bhosle Marg Junction (Chembur) | 0.27 | 2.93 |
| 126AS (126AS) | 0 | Byculla Station (E) | Robert Gomes Chowk (Byculla-E) | 0.64 | 3.3 |
| 371AS (371AS) | 0 | Kapadia Nagar | Mohammad Estate | 0.23 | 2.82 |
| 110 (110-2) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 151 (151-2) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 164AS (164AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 165 (165) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 169 (169) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 171AS (171AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 172 (172) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 174AS (174AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 175AS (175AS) | 1 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 305C (305C) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 351AS (351AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 354AS (354AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 357AS (357AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 385AS (385AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 59AS (59AS) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 63AS (63AS-2) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 88 (88-2) | 0 | Veer Hutatma Bhai Kotwal Udyan (Plaza) | Khodadad Circle (Dadar TT) | 0.69 | 3.18 |
| 380AS (380AS) | 1 | Bainganwadi | Bainganwadi | 0.17 | 2.65 |
| 368LTD (368LTD) | 1 | Chainani Elder S Home | Mithagar (Mulund-E) | 0.15 | 2.6 |
| 373AS (373AS) | 1 | Chainani Elder S Home | Mithagar (Mulund-E) | 0.15 | 2.6 |
| 513C (513C) | 0 | Chainani Elder S Home | Mithagar (Mulund-E) | 0.15 | 2.6 |
| 1AS (1AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 11LTD (11LTD) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 15 (15-3) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 19AS (19AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 134AS (134AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 21AS (21AS-2) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 25AS (25AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 3AS (3AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 4AS (4AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 5AS (5AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 50 (50-2) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 51 (51-6) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 6LTD (6LTD-1) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 6LTD (6LTD-2) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 67 (67-5) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 69 (69-2) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 7AS (7AS-1) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 8AS (8AS) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 9 (9-3) | 0 | Byculla Station (E) | Jijamata Udyan (Byculla) | 0.59 | 2.97 |
| 27 (27-2) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 30AS (30AS) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 329AS (329AS) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 354AS (354AS) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 368LTD (368LTD) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 373AS (373AS) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 382LTD (382LTD) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 404AS (404AS) | 0 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 488AS (488AS) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 489LTD (489LTD) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 493AS (493AS) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 54C (54C) | 1 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 517AS (517AS) | 0 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 533AS (533AS) | 0 | Nalanda Society (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.24 | 2.6 |
| 458AS (458AS) | 1 | Ramabai Nagar (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.68 | 3.04 |
| 490AS (490AS-1) | 1 | Ramabai Nagar (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.68 | 3.04 |
| 490AS (490AS-2) | 1 | Ramabai Nagar (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.68 | 3.04 |
| 491AS (491AS) | 1 | Ramabai Nagar (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.68 | 3.04 |
| 53AS (53AS) | 0 | Ramabai Nagar (Ghatkopar-E) | R.T.O.(Ghatkopar-E) | 0.68 | 3.04 |
| 76AS (76AS) | 1 | Government Colony; Indian Medical Association Chowk | Mahalaxmi Race Course; Zenith House | 0.55 | 2.9 |
| 77AS (77AS) | 1 | Government Colony; Indian Medical Association Chowk | Mahalaxmi Race Course; Zenith House | 0.55 | 2.9 |
| 124AS (124AS) | 0 | Government Colony; Indian Medical Association Chowk | Mahalaxmi Race Course; Zenith House | 0.55 | 2.9 |
| 351AS (351AS) | 0 | Government Colony; Indian Medical Association Chowk | Mahalaxmi Race Course; Zenith House | 0.55 | 2.9 |
| 78AS (78AS) | 0 | Government Colony; Indian Medical Association Chowk | Mahalaxmi Race Course; Zenith House | 0.55 | 2.9 |
| 183AS (183AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 22AS (22AS-1) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 37AS (37AS) | 0 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 310 (310-1) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 310AS (310AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 311AS (311AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 313AS (313AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 318AS (318AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 320 (320-1) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 325AS (325AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 326AS (326AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 330AS (330AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 332AS (332AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 365AS (365AS) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 446 (446) | 1 | Nehru Nagar (Kurla-E); Tilak Nagar Junction | Buddha Nagar (Kurla-W) | 1 | 3.31 |
| 501LTD (501LTD) | 1 | Talavali Naka; Nocil Company | Ghansoli Village | 0.53 | 2.82 |
| 512LTD (512LTD) | 0 | Talavali Naka; Nocil Company | Ghansoli Village | 0.53 | 2.82 |
| 513C (513C) | 0 | Talavali Naka; Nocil Company | Ghansoli Village | 0.53 | 2.82 |
| 525LTD (525LTD) | 0 | Talavali Naka; Nocil Company | Ghansoli Village | 0.53 | 2.82 |
| 45AS (45AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 11LTD (11LTD) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 15 (15-3) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 110 (110-2) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 171AS (171AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 21AS (21AS-2) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 22AS (22AS-2) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 25AS (25AS) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 29LTD (29LTD) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 30AS (30AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 305C (305C) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 351AS (351AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 354AS (354AS) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 357AS (357AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 368LTD (368LTD) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 385AS (385AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 5AS (5AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 59AS (59AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 521C (521C) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 526LTD (526LTD) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 526AS (526AS) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 6LTD (6LTD-1) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 6LTD (6LTD-2) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 66 (66-2) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 8AS (8AS) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 85AS (85AS) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 88 (88-2) | 1 | Ruia College (Matunga-E) | Khodadad Circle (Dadar TT) | 0.58 | 2.83 |
| 92AS (92AS) | 1 | Jagatdev N.Varma Chowk; Kapole Niwas | Khodadad Circle (Dadar TT) | 0.86 | 3.11 |
| 372AS (372AS-1) | 1 | Dnyansampada High School | Bainganwadi | 0.48 | 2.71 |
| 493AS (493AS) | 1 | Dnyansampada High School | Bainganwadi | 0.48 | 2.71 |
| 507AS (507AS) | 0 | Dnyansampada High School | Bainganwadi | 0.48 | 2.71 |
| 517AS (517AS) | 0 | Dnyansampada High School | Bainganwadi | 0.48 | 2.71 |
| 533AS (533AS) | 0 | Dnyansampada High School | Bainganwadi | 0.48 | 2.71 |
| 255LTD (255LTD) | 0 | Kala Nagar (Bandra-E) | Padmashree Mohammed Rafi Chowk; Bandra (W) | 0.99 | 3.19 |
| 67 (67-4) | 1 | Khodadad Circle (Dadar TT) | Khodadad Circle (Dadar TT) | 0.22 | 2.42 |
| 921LTD (921LTD-1) | 1 | Khodadad Circle (Dadar TT) | Khodadad Circle (Dadar TT) | 0.22 | 2.42 |
| 223LTD (223LTD-2) | 0 | Special Steel; Rajendra Nagar | Magathane Depot | 0.21 | 2.35 |
| 226AS (226AS) | 1 | Special Steel; Rajendra Nagar | Magathane Depot | 0.21 | 2.35 |
| 461AS (461AS) | 1 | Special Steel; Rajendra Nagar | Magathane Depot | 0.21 | 2.35 |
| 465AS (465AS) | 1 | Special Steel; Rajendra Nagar | Magathane Depot | 0.21 | 2.35 |
| 479AS (479AS) | 0 | Special Steel; Rajendra Nagar | Magathane Depot | 0.21 | 2.35 |
| 87LTD (87LTD-2) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Nehru Planetarium (Worli) | 0.95 | 3.06 |
| 92AS (92AS) | 0 | Vatsalabai Desai Chowk (Haji Ali) | Nehru Planetarium (Worli) | 0.95 | 3.06 |
| 53AS (53AS) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 55C (55C) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 504AS (504AS) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 505C (505C) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 507AS (507AS) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 512LTD (512LTD) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 526LTD (526LTD) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 526AS (526AS) | 1 | Turbhe Police Station | Turbhe Naka (Janata Market) | 0.73 | 2.81 |
| 181 (181) | 1 | Hanuman Road (Vile Parle -E) | Sambhaji Nagar (Vile Parle-E) | 0.39 | 2.44 |
| 348LTD (348LTD) | 1 | Hanuman Road (Vile Parle -E) | Sambhaji Nagar (Vile Parle-E) | 0.39 | 2.44 |
| 40C (40C) | 1 | Hanuman Road (Vile Parle -E) | Sambhaji Nagar (Vile Parle-E) | 0.39 | 2.44 |
