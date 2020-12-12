$(async function() {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $ownStories = $('#my-articles');
	const $favStories = $('#favorited-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $navPost = $('#nav-post');
	const $userProfile = $('#user-profile');
	const $editForm = $('#edit-article-form');

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

	$loginForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
		await generateStories();
		generateFavStories();
		generateMyStories();
	});

	/**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Event listener for submitting story.
   */

	$submitForm.on('submit', async function(evt) {
		evt.preventDefault();
		// grab the required fields
		let author = $('#author').val();
		let title = $('#title').val();
		let url = $('#url').val();

		// call the add story method, which posts the story to the API
		const newStory = { author: author, title: title, url: url };
		await storyList.addStory(currentUser, newStory);
		await generateStories();

		$('#author').val('');
		$('#title').val('');
		$('#url').val('');

		await checkIfLoggedIn();
	});
	/**
   * Event listener for editing story.
   */

	$editForm.on('submit', async function(evt) {
		evt.preventDefault();
		// grab the required fields
		let author = $('#edit-author').val();
		let title = $('#edit-title').val();
		let url = $('#edit-url').val();
		let storyId = $('#edit-id').val();

		const storyObj = { author, title, url };

		// call the edit story method, which updates the story info
		await currentUser.editStory(storyId, storyObj);
		await checkIfLoggedIn();
		hideElements();
		$ownStories.show();
	});

	/**
   * Log Out Functionality
   */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
   * Event Handler for Clicking Login
   */

	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
   * Event handler for Navigation to Homepage
   */

	$('body').on('click', '#nav-all', async function() {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
   * Event handler for Navigation to story submission form
   */
	$navPost.on('click', function() {
		hideElements();
		$submitForm.show();
	});

	/**
   * Event handler for Navigation to Favorites
   */
	$('body').on('click', '#nav-favs', function() {
		hideElements();
		$favStories.show();
	});

	/**
   * Event handler for Navigation to My Stories
   */
	$('body').on('click', '#nav-my-stories', function() {
		hideElements();
		$ownStories.show();
	});

	/**
   * Event handler for Navigation to User Profile
   */
	$('body').on('click', '#nav-user-profile', function() {
		hideElements();
		$userProfile.show();
	});

	/**
   * Event handler for adding favorite article
   */
	$('body').on('click', '.off', async function() {
		const storyId = $(this).parent().parent().attr('id');
		$(this).toggleClass('fas');
		$(this).toggleClass('far');
		$(this).toggleClass('off');
		$(this).toggleClass('on');
		await currentUser.addFavorite(storyId);
		generateFavStories();
	});

	/**
   * Event handler for deleting a favorite article
   */
	$('body').on('click', '.on', async function() {
		const storyId = $(this).parent().parent().attr('id');
		$(this).toggleClass('far');
		$(this).toggleClass('fas');
		$(this).toggleClass('off');
		$(this).toggleClass('on');
		await currentUser.deleteFavorite(storyId);
		generateFavStories();
	});

	/**
   * Event handler for deleting a story
   */
	$('body').on('click', '.fa-trash', async function() {
		const storyId = $(this).parent().parent().attr('id');

		await currentUser.deleteStory(storyId);
		await checkIfLoggedIn();
	});

	/**
   * Event handler for editing a story
   */
	$('body').on('click', '.fa-pencil-alt', async function() {
		const storyId = $(this).parent().parent().attr('id');
		const story = await storyList.getStory(storyId);

		$('#edit-title').val(story.title);
		$('#edit-author').val(story.author);
		$('#edit-url').val(story.url);
		$('#edit-id').val(storyId);

		hideElements();
		$editForm.show();
	});

	/**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
			generateFavStories();
			generateMyStories();
			addUserInfo();
		}
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();

		addUserInfo();
	}

	/**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
   * A rendering function to generate a favorite stories list and append it to DOM.
   */

	function generateFavStories() {
		// get currentUser favorite stories
		let favorites = currentUser.favorites;
		// empty out that part of the page
		$favStories.empty();

		// loop through all of our stories and generate HTML for them
		for (let fav of favorites) {
			const result = generateStoryHTML(fav);
			$favStories.append(result);
		}
	}

	/**
   * A rendering function to generate my stories list and append it to DOM.
   */
	function generateMyStories() {
		// get currentUser favorite stories
		let myStories = currentUser.ownStories;
		// empty out that part of the page
		$ownStories.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of myStories) {
			const result = generateStoryHTML(story);
			$ownStories.append(result);
		}

		// add trash icon and remove event listeners
		$('#my-articles .icons').prepend('<i class="fas fa-trash"></i>');
		$('#my-articles .icons').prepend('<i class="fas fa-pencil-alt"></i>');
		$('#my-articles .fas').off('click', '**');
		$('#my-articles .far').off('click', '**');
	}

	/**
   * A function to render HTML for an individual Story instance
   */
	function generateStoryHTML(story) {
		let hostName = getHostName(story.url);
		let symbol;

		//check if story has been favorited and add correct icon
		if (currentUser) {
			symbol = 'far fa-star off';
			for (let fav of currentUser.favorites) {
				if (fav.storyId === story.storyId) {
					symbol = 'fas fa-star on';
				}
			}
		}

		// render story markup
		const storyMarkup = $(`
      <li id="${story.storyId}">
      <span class="icons"><i class="${symbol}"></i><span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$userProfile,
			$favStories,
			$editForm
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$('#nav-user-profile').text(`${currentUser.username}`);
		$('#nav-welcome').show();
		$('#logged-in').show();
	}

	function addUserInfo() {
		$('#profile-name').html(`<b>Name:</b> ${currentUser.name}`);
		$('#profile-username').html(`<b>Username:</b> ${currentUser.username}`);
		$('#profile-account-date').html(`<b>Account Created:</b> ${currentUser.createdAt}`);
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});
