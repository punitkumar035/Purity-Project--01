# Cross-Page & On-Page Links — User Guide

A link connects two stations **without drawing a long flow line**. It is a mated
pair of shapes that both represent **one shared flow**: edit the properties from
either half and both halves show the same values.

- **On-Page Link**: both stations are on the same page.
- **Cross-Page Link**: the stations are on different pages. The kind follows
  where the halves actually are and switches by itself if you move one.

## Create a pair (Helpbook gestures)

1. Drag **On-Page Link** or **Cross-Page Link** from the *Links / Cross-Page*
   palette group onto the canvas.
2. Drag either endpoint onto the first station's port (red-square snap).
3. Copy the half — **Ctrl+C**, then **Ctrl+V** on the same or another page —
   or **Ctrl+drag** it, or right-click a station output port and use
   **Send to page…**. A half's menu also offers *Create mate*.
4. Drag the mate's free endpoint onto the second station's port.

The pair is valid when **mate text appears on both halves**: each half shows the
far end's `station-port` (e.g. distributor half shows `3010-1`, pan half shows
`3310-9`). No text means the glue failed — redo it. One half must sit on an
output port and the other on an input port.

## Work with a pair

- **Double-click** either half: opens the shared flow properties (same panel).
- **Right-click → Go to mate**: jumps to the mate's page and selects it.
- **Right-click a half**: copy / paste mate, reset shared flow values
  (zeroes a runaway recycle quantity so the loop can re-solve), delete.
- **Deleting one half** asks: delete both halves and the flow, or keep the mate
  (flagged as unpaired). Deleting a station or page keeps surviving mates and
  flags them; the flow ends are repaired automatically.
- Every operation above is a **single undo step** (Ctrl+Z).

## Solve behaviour

- An incomplete pair **blocks the solve** with a specific fix-it message.
  Use **Go to field** in Solve Issues to jump to the half, on its page.
- A complete pair solves exactly like a drawn line on one page — page
  boundaries do not affect balances, required-flow tracing, or convergence.
- **Flow Table** (Data → Tables, or File → Output → Export Flow Table)
  lists every flow as `From, FromPort, To, ToPort`, with `0` for external
  boundaries. Save as CSV for Excel.

## Rules to remember

- Use on-page links on one page, cross-page links between pages.
- A pair needs one output-glued half and one input-glued half.
- Station numbers must be unique across **all** pages — mate labels address
  stations by number.
- Copying a complete pair is blocked; duplicate the flow instead.
