# Classroom Pass

A small, front-end-only classroom pass app. Students can request a pass and report when they return; teachers can approve or deny requests, keep track of students who are out, flag missing students, and confirm returns.

## Run the app

Open `index.html` directly in a modern browser. No server, build step, dependencies, or internet connection are required.

## Use the app

1. In **Student** mode, choose a name from the suggestions or type a name. Optionally choose a reason, then select **Request Restroom Pass**.
2. In **Teacher** mode, approve or deny pending requests. Approved passes appear under **Active passes**.
3. When back, the student selects **I’m Back**. The teacher can confirm that report to move the pass into recent history. Teachers can also select **Mark returned** when checking a student back in themselves.
4. If an approved student is unaccounted for, select **Mark missing** on their active pass. Missing passes stay highlighted in the active list and history until the student reports back or the teacher selects **Confirm returned**. A student's return report still requires teacher confirmation before archiving.
5. Select **Student** or **Teacher** in the header to switch modes.

The app includes a few example names to make it easy to try. A name typed for a new request is added to the local student list.

## Data and privacy

Student names and pass records are saved in this browser's `localStorage` under `classroom-pass-state`. The selected student name stays in memory in the current tab. Data is local to the browser and does not sync to other devices or browsers. Clearing browser storage removes saved pass information.

This is a classroom workflow aid, not an authenticated or real-time attendance system.
