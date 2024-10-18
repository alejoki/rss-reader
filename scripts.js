// scripts.js

class FeedManager {
    constructor() {
        this.feedUrls = JSON.parse(localStorage.getItem('feedUrls')) || [];
        this.maxFeeds = 20;
        this.currentFeedIndex = 0;
        this.feedMinWidth = 350; // Minimum width required for each feed
        this.feedElements = []; // Array to store feed elements
        this.init();
    }

    init() {
        // Bind methods to ensure 'this' context is correct
        this.addFeed = this.addFeed.bind(this);
        this.toggleTheme = this.toggleTheme.bind(this);
        this.showPreviousFeed = this.showPreviousFeed.bind(this);
        this.showNextFeed = this.showNextFeed.bind(this);
        this.checkViewport = this.checkViewport.bind(this);

        document.getElementById('feed-form').addEventListener('submit', this.addFeed);
        document.getElementById('theme-toggle').addEventListener('click', this.toggleTheme);

        // Wrap renderFeeds in an arrow function to preserve 'this' context
        document.getElementById('update-feeds').addEventListener('click', async () => {
            await this.renderFeeds();
        });

        document.getElementById('prev-feed').addEventListener('click', this.showPreviousFeed);
        document.getElementById('next-feed').addEventListener('click', this.showNextFeed);

        window.addEventListener('resize', this.checkViewport);

        // Load the saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }

        this.renderFeeds();
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        alert('Theme has been toggled!');
    }

    addFeed(event) {
        event.preventDefault();
        let feedUrl = document.getElementById('feed-url').value.trim();

        // Basic URL validation
        if (!this.isValidUrl(feedUrl)) {
            alert('Please enter a valid URL.');
            return;
        }

        // Sanitize the input
        feedUrl = this.sanitizeInput(feedUrl);

        if (this.feedUrls.length < this.maxFeeds) {
            this.feedUrls.push(feedUrl);
            localStorage.setItem('feedUrls', JSON.stringify(this.feedUrls));
            this.renderFeeds();
        } else {
            alert(`You can only add up to ${this.maxFeeds} feeds.`);
        }
        document.getElementById('feed-url').value = '';
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    sanitizeOutput(output) {
        const div = document.createElement('div');
        div.textContent = output;
        return div.innerHTML;
    }

    removeFeed(index) {
        this.feedUrls.splice(index, 1);
        localStorage.setItem('feedUrls', JSON.stringify(this.feedUrls));
        if (this.currentFeedIndex >= this.feedUrls.length) {
            this.currentFeedIndex = Math.max(0, this.feedUrls.length - 1);
        }
        this.renderFeeds();
    }

    async renderFeeds() {
        this.feedElements = []; // Reset the feed elements array
        const feedContainer = document.getElementById('feed-container');
        feedContainer.innerHTML = ''; // Clear existing feeds

        // Show loading indicator
        const loadingIndicator = document.getElementById('loading');
        loadingIndicator.style.display = 'block';

        if (this.feedUrls.length === 0) {
            loadingIndicator.style.display = 'none'; // Hide loading indicator
            feedContainer.innerHTML = '<p>No feeds added. Please add an RSS feed URL.</p>';
            document.getElementById('feed-navigation').style.display = 'none';
            return;
        }

        // Fetch and store feed data in parallel
        const fetchPromises = this.feedUrls.map((url, index) => this.fetchAndRenderFeed(url, index));
        await Promise.all(fetchPromises);

        // Hide loading indicator after feeds are rendered
        loadingIndicator.style.display = 'none';

        this.checkViewport();
    }

    async fetchAndRenderFeed(url, index) {
        const feedColumn = document.createElement('div');
        feedColumn.className = 'feed-column';
        feedColumn.dataset.index = index;

        try {
            // Fetch the RSS feed (using a CORS proxy if necessary)
            // Uncomment the following line and set your proxy URL if needed
            // const proxyUrl = 'https://your-proxy-url.com/';
            // const response = await fetch(proxyUrl + url);

            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Error parsing XML: ' + parserError.textContent);
            }

            // Extract feed title and items
            const channel = xmlDoc.querySelector('channel');
            const feedTitle = channel.querySelector('title').textContent;
            const items = Array.from(channel.querySelectorAll('item'));

            this.updateFeedHeader(feedColumn, feedTitle, index);
            this.displayFeed(feedColumn, items);
        } catch (error) {
            console.error('Error fetching or parsing feed:', error);
            this.updateFeedHeader(feedColumn, `Feed ${index + 1} (Error)`, index);
            feedColumn.innerHTML += '<p>Error loading feed.</p>';
        }

        // Store the feed element
        this.feedElements[index] = feedColumn;
    }

    updateFeedHeader(feedColumn, title, index) {
        const header = document.createElement('div');
        header.className = 'feed-header';

        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        header.appendChild(titleElement);

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-feed-button';
        removeButton.textContent = 'Remove Feed';

        removeButton.addEventListener('click', () => {
            this.removeFeed(index);
        });

        header.appendChild(removeButton);
        feedColumn.appendChild(header);
    }

    displayFeed(feedColumn, items) {
        items.forEach(item => {
            const titleElement = item.querySelector('title');
            const linkElement = item.querySelector('link');
            const descriptionElement = item.querySelector('description');

            const title = titleElement ? this.sanitizeOutput(titleElement.textContent) : 'No title';
            const link = linkElement ? this.sanitizeOutput(linkElement.textContent) : '#';
            const description = descriptionElement ? this.sanitizeOutput(descriptionElement.textContent) : 'No description';

            const card = document.createElement('div');
            card.className = 'feed-item';
            card.innerHTML = `
                <h3><a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
                <p>${description}</p>
            `;
            feedColumn.appendChild(card);
        });
    }

    showPreviousFeed() {
        if (this.currentFeedIndex > 0) {
            this.currentFeedIndex--;
            this.updateVisibleFeeds();
            this.updateNavigationButtons();
        }
    }

    showNextFeed() {
        if (this.currentFeedIndex + this.visibleFeedsCount < this.feedElements.length) {
            this.currentFeedIndex++;
            this.updateVisibleFeeds();
            this.updateNavigationButtons();
        }
    }

    updateVisibleFeeds() {
        const feedContainer = document.getElementById('feed-container');
        feedContainer.innerHTML = ''; // Clear existing feeds

        // Determine how many feeds can fit in the viewport
        const viewportWidth = document.getElementById('feed-container').clientWidth;
        this.visibleFeedsCount = Math.floor(viewportWidth / this.feedMinWidth);

        // Ensure at least one feed is displayed
        if (this.visibleFeedsCount < 1) {
            this.visibleFeedsCount = 1;
        }

        // Adjust currentFeedIndex if necessary
        if (this.currentFeedIndex + this.visibleFeedsCount > this.feedElements.length) {
            this.currentFeedIndex = this.feedElements.length - this.visibleFeedsCount;
        }
        if (this.currentFeedIndex < 0) {
            this.currentFeedIndex = 0;
        }

        const endIndex = this.currentFeedIndex + this.visibleFeedsCount;

        for (let i = this.currentFeedIndex; i < endIndex; i++) {
            if (this.feedElements[i]) {
                feedContainer.appendChild(this.feedElements[i]);
            }
        }

        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevButton = document.getElementById('prev-feed');
        const nextButton = document.getElementById('next-feed');

        prevButton.disabled = this.currentFeedIndex === 0;
        nextButton.disabled = (this.currentFeedIndex + this.visibleFeedsCount) >= this.feedElements.length;

        // Show navigation buttons only when necessary
        if (this.feedElements.length > this.visibleFeedsCount) {
            document.getElementById('feed-navigation').style.display = 'block';
        } else {
            document.getElementById('feed-navigation').style.display = 'none';
        }
    }

    checkViewport() {
        this.updateVisibleFeeds();
    }
}

// Instantiate the FeedManager
const feedManager = new FeedManager();