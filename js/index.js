import { translate as t } from "@nextcloud/l10n";

import MenuEntry from "./views/MenuEntry.svelte";
import Prompt from "./views/Prompt.svelte";
import { directoryStore } from "./store";


// This contains the dialog, when it is active.
new Prompt({
	target: document.body,
	props: {},
})


/* The Files app provides an API to add custom entries to the "new file"
 * menu, however this requires that a file name is prompted for within the
 * menu itself.
 *
 * As described at https://github.com/danth/transfer/discussions/3#discussioncomment-2522254,
 * we want to prompt for the file name at the same time as asking for the
 * download URL. Therefore the Files API cannot be used, instead we must
 * attach our menu entry by hand each time the "new file" menu is opened.
 *
 * There are two events which tell us the menu was opened:
 * 1. The menu element was created,
 *    which happens the first time it is opened.
 * 2. `display: none` was removed from the element,
 *    which happens for each subsequent opening.
 */

// Calls our function when a new file list is loaded.
window.OC.Plugins.register("OCA.Files.NewFileMenu", {
	attach: (menu) => {
		const fileList = menu.fileList;

		/* We only want to attach to the main file list,
		 * not the file list used in the move/copy dialog.
		 */
		if (fileList.id !== "files") return;

		// This waits for the "new file" menu to be created.
		new MutationObserver((mutations, observer) => {
			for (const mutation of mutations) {
				// Check if the menu has been created yet.
				const newFileMenu = mutation.target.getElementsByClassName(menu.className)[0];

				if (newFileMenu) {
					showMenuEntry(fileList, newFileMenu);

					/* Handle showing the menu entry each subsequent
					 * time the menu is opened.
		       */
					attachListener(fileList, newFileMenu);

					// The menu is only created once,
					// so there is no need to listen for further events.
					observer.disconnect();
				}
			}
		}).observe(
			/* #controls is the top bar of the files app, containing the
			 * current folder path and various buttons. We want to react
			 * when the "new file" menu is opened within it.
			 */
			document.getElementById("controls"),
			{ childList: true, subtree: true }
		);
	},
});

function attachListener(fileList, newFileMenu) {
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			// After the first activation, where the menu element is created,
			// subsequent activations simply toggle `display: none`.
			if (
				mutation.attributeName == "style" &&
				mutation.oldValue == "display: none;"
			) {
				showMenuEntry(fileList, newFileMenu);
			}
		}
	}).observe(newFileMenu, {
		// We want to pay attention to the `style` attribute.
		attributes: true,
		attributeOldValue: true
	});
}

function showMenuEntry(fileList, newFileMenu) {
	// Record the current directory for use within the prompt.
	directoryStore.set(fileList.getCurrentDirectory());

	// Create the menu entry itself.
	const menuItems = newFileMenu.firstChild;
	new MenuEntry({
		target: menuItems,
		// Insert before the second child, below "Upload file".
		anchor: menuItems.children[1],
	});
}
