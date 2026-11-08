# Storyboard

Write the storyboard before any art or code. It is the contract with the speaker, and every later argument ("why is this card here?") is settled by looking at it.

## Questions to settle first

1. **Where does the talk happen?** One place, drawn once. Name five to eight objects in it that will be the stations.
2. **What is the order of the stations?** The story order, not the spatial order. The camera can jump; the van Wijk path handles far moves without an extra page.
3. **What must not appear?** Devices, logos, people, vendor names. Write it down; generated images will add them back unless the prompt forbids them, and the speaker may have reasons they do not want on a slide.
4. **Which real material exists and which is still owed?** Screenshots of the real UI in a real session, logs, photos. Each one has a shot that depends on it and a date it is due.
5. **How long is the slot?** Twenty minutes fits 15 to 22 shots. Count the words in the notes later: Mandarin runs about 200 characters a minute on stage; add three seconds per camera move.

## The table

| # | shot | what the camera sees | HUD | what is said (source) | time |
| --- | --- | --- | --- | --- | --- |
| 1 | wide | the whole room | title | opening | 0:00 |
| 2 | push to the lecturer's mouth | close-up plate, sound rings | caption | the one-sentence want | 0:40 |
| 3 | ride the wave to the laptop | the laptop, scene blurs | center | station 1 | 1:30 |
| 4 | enter the screen | real UI, unfolded flat | side | station 2 | 2:30 |
| … | | | | | |
| n | pull back to wide | the whole room, rings still pulsing | center, no blur | licence, QR, questions | 19:00 |

Columns that matter: the HUD mode decides whether the picture stays readable (`side`) or becomes context (`center`); the source column keeps every claim traceable to a README, an ADR, a log, or a measurement.

## Art list

For each image: size, where it is used, and constraints.

| image | size | used in | constraints |
| --- | --- | --- | --- |
| wide scene | 4K 16:9 | every shot | people small; the screen blank; sky or wall empty where cards will sit; nothing on the forbidden list |
| close-up plate | 2K | one shot | same character, mouth open, empty space on the side the path leaves from |
| other plates | 2K | | only where the camera gets within ~400 world px of a subject |

## Materials owed by the speaker

| material | shot | status |
| --- | --- | --- |
| screenshot of the real app mid-session | 4, 9, 13 | due after the next real session |
| the failure log or screen | 11 | can be a card with the log line instead |

## Schedule

Work backwards from the talk: projector test two days before; rehearsal with timing three days before; real material one week before; art and deck ten days before. The deck itself takes a day once the storyboard and the scene exist; the review rounds take longer than the build.

## Status line

Keep one line at the top of the storyboard: the date it was implemented and the deck path. After that the deck is the truth and the storyboard is history; log changes in the project's status file, not here.
