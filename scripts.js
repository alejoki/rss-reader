const DOMPurify = window.DOMPurify;

// **Requirement 5/5 (JavaScript Basics): Consistent use of Object-Oriented JavaScript principles**
class FeedManager {
    constructor() {
        // **Requirement 3/5 (JavaScript Basics): Use of arrays, objects, and functions**
        this.feedUrls = JSON.parse(localStorage.getItem('feedUrls')) || [];
        this.maxFeeds = 10;
        this.currentFeedIndex = 0;
        this.feedMinWidth = 350;
        this.feedElements = new Map();
        this.init();
        //localStorage.removeItem('feedUrls'); // Clear local storage
    }

    init() {
        // **Requirement 2/5 (JavaScript Basics): Multiple event listeners and basic DOM manipulations**
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

        if (!/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.addEventListener('resize', this.checkViewport);
        }

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
         // **Requirement 1/5 (JavaScript Basics): Simple interactions (like alerts on button click)**
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
        feedUrl = this.sanitizeInputOutput(feedUrl);

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

    sanitizeInputOutput(output) {
        const div = document.createElement('div');
        div.textContent = output;
        return div.innerHTML;
    }

    removeFeed(url) {
        const index = this.feedUrls.indexOf(url);
        if (index !== -1) {
            this.feedUrls.splice(index, 1);
            localStorage.setItem('feedUrls', JSON.stringify(this.feedUrls));
            this.feedElements.delete(url);
            this.currentFeedIndex = Math.max(0, this.feedUrls.length - 1);
            this.updateVisibleFeeds();
        } else {
            alert('Feed not found.');
        }
    }

    // **Requirement 2/5 (Asynchronous Operations): Successful implementation of an AJAX call or Fetch**
    // **Requirement 3/5 (Asynchronous Operations): Data from the asynchronous call is displayed on the webpage**
    // **Requirement 5/5 (Asynchronous Operations): Efficient use of asynchronous operations to improve the user experience**
    async renderFeeds() {
        this.feedElements.clear();
        const feedContainer = document.getElementById('feed-container');
        feedContainer.innerHTML = '';
    
        const loadingIndicator = document.getElementById('loading');
        loadingIndicator.style.display = 'block';
        // **Requirement 1/5 (Asynchronous Operations): Use of timers.**
        await new Promise(resolve => setTimeout(resolve, 1000)); // Artificial delay for loading indicator
    
        if (this.feedUrls.length === 0) {
            loadingIndicator.style.display = 'none';
            feedContainer.innerHTML = '<p>No feeds added. Please add an RSS feed URL.</p>';
            document.getElementById('feed-navigation').style.display = 'none';
            return;
        }
    
        // Fetch and store feed data in parallel
        const fetchPromises = this.feedUrls.map((url) => this.fetchAndRenderFeed(url));
        await Promise.all(fetchPromises);
    
        loadingIndicator.style.display = 'none';
    
        this.checkViewport();
    }

    async fetchAndRenderFeed(url) {
        const feedColumn = document.createElement('div');
        feedColumn.className = 'feed-column';
        
        try {
            // Fetch the RSS feed
            const proxyUrl = `https://jokine.fi/fetch-feed?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok');
        
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
            // **Requirement 4/5 (Asynchronous Operations): Error handling is implemented (for failed API calls, etc.)**
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Error parsing XML: ' + parserError.textContent);
            }
        
            const channel = xmlDoc.querySelector('channel');
            const feedTitle = channel.querySelector('title').textContent;
            const items = Array.from(channel.querySelectorAll('item'));
        
            this.updateFeedHeader(feedColumn, feedTitle, url);
            this.displayFeed(feedColumn, items);
        } catch (error) {
            console.error('Error fetching or parsing feed:', error);
            this.updateFeedHeader(feedColumn, `Feed Error`, url);
        
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Error loading feed.';
            feedColumn.appendChild(errorMessage);
        }
        
        this.feedElements.set(url, feedColumn);
    }

    updateFeedHeader(feedColumn, title, url) {
        const header = document.createElement('div');
        header.className = 'feed-header';
    
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        header.appendChild(titleElement);
    
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-feed-button';
        removeButton.textContent = 'Remove';
    
        removeButton.addEventListener('click', () => {
            this.removeFeed(url);
        });
    
        header.appendChild(removeButton);
        feedColumn.appendChild(header);
    }

    displayFeed(feedColumn, items) {
        // **Requirement 4/5 (JavaScript Basics): Advanced logic, looping through data, and dynamic DOM updates**
        items.forEach(item => {
            const titleElement = item.querySelector('title');
            const linkElement = item.querySelector('link');
            const descriptionElement = item.querySelector('description');
            const mediaElement = item.querySelector('media\\:content, enclosure'); // RSS images
            const enclosureElement = item.querySelector('enclosure'); // Another way of including media
    
            const title = titleElement ? this.sanitizeInputOutput(titleElement.textContent) : 'No title';
            const link = linkElement ? this.sanitizeInputOutput(linkElement.textContent) : '#';
            const description = descriptionElement
            ? DOMPurify.sanitize(descriptionElement.textContent, { ALLOWED_TAGS: ['b', 'br', 'center'] })
            : 'No description';
    
            const card = document.createElement('div');
            card.className = 'feed-item';
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-feed-item';
            const deleteIcon = document.createElement('img');
            deleteIcon.className = 'delete-icon';
            deleteIcon.src = './svg/cross.svg';
            deleteIcon.alt = 'Delete';
            deleteButton.appendChild(deleteIcon);
            deleteButton.addEventListener('click', () => {
                card.remove();
            });
            card.appendChild(deleteButton);

            // Handle images if found in <media:content> or <enclosure> elements
            if (mediaElement) {
                const imgSrc = mediaElement.getAttribute('url');
                if (imgSrc) {
                const image = document.createElement('img');
                image.src = imgSrc;
                image.alt = 'Feed Image';
                image.className = 'feed-image';
                card.appendChild(image);
                }
            } else if (enclosureElement) {
                const imgSrc = enclosureElement.getAttribute('url');
                if (imgSrc && enclosureElement.getAttribute('type').includes('image')) {
                    const image = document.createElement('img');
                    image.src = imgSrc;
                    image.alt = 'Feed Image';
                    image.className = 'feed-image';
                    card.appendChild(image);
                }
            }
    
            // Use DOM methods to build the card content
            const cardTitle = document.createElement('h3');
            const titleLink = document.createElement('a');
            titleLink.href = link;
            titleLink.target = '_blank';
            titleLink.rel = 'noopener noreferrer';
            titleLink.textContent = title;
            cardTitle.appendChild(titleLink);
    
            const cardDescription = document.createElement('p');
            cardDescription.innerHTML = description;
    
            card.appendChild(cardTitle);
            card.appendChild(cardDescription);
    
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
        const maxIndex = Math.max(0, this.feedUrls.length - this.visibleFeedsCount);
        if (this.currentFeedIndex < maxIndex) {
            this.currentFeedIndex++;
            this.updateVisibleFeeds();
            this.updateNavigationButtons();
        }
    }

    updateVisibleFeeds() {
        const feedContainer = document.getElementById('feed-container');
        feedContainer.innerHTML = ''; // Clear existing feeds
    
        // Determine how many feeds can fit in the viewport
        const viewportWidth = feedContainer.clientWidth;
        this.visibleFeedsCount = Math.floor(viewportWidth / this.feedMinWidth);
    
        // Ensure at least one feed is displayed
        if (this.visibleFeedsCount < 1) {
            this.visibleFeedsCount = 1;
        }
    
        // Adjust currentFeedIndex if necessary
        if (this.currentFeedIndex + this.visibleFeedsCount > this.feedUrls.length) {
            this.currentFeedIndex = this.feedUrls.length - this.visibleFeedsCount;
        }
        if (this.currentFeedIndex < 0) {
            this.currentFeedIndex = 0;
        }
        const scrollPosition = window.scrollY || window.pageYOffset;
    
        const endIndex = this.currentFeedIndex + this.visibleFeedsCount;
        const visibleUrls = this.feedUrls.slice(this.currentFeedIndex, endIndex);
    
        for (const url of visibleUrls) {
            const feedElement = this.feedElements.get(url); // Access Map with url
            if (feedElement) {
                feedContainer.appendChild(feedElement);
            } else {
                // Handle case where feedElement is not available
                const placeholder = document.createElement('div');
                placeholder.className = 'feed-column';
                placeholder.innerHTML = `<div class="feed-header">
                    <h2>Feed Error</h2>
                    <button class="remove-feed-button">Remove</button>
                </div>
                <p>Error loading feed.</p>`;
                const removeButton = placeholder.querySelector('.remove-feed-button');
                removeButton.addEventListener('click', () => {
                    this.removeFeed(url);
                });
                feedContainer.appendChild(placeholder);
            }
        }
        window.scrollTo(0, scrollPosition);
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevButton = document.getElementById('prev-feed');
        const nextButton = document.getElementById('next-feed');
    
        const maxIndex = Math.max(0, this.feedUrls.length - this.visibleFeedsCount);
    
        prevButton.disabled = this.currentFeedIndex === 0;
        nextButton.disabled = this.currentFeedIndex >= maxIndex;
    
        // Show navigation buttons only when necessary
        if (this.feedUrls.length > this.visibleFeedsCount) {
            document.getElementById('feed-navigation').style.display = 'block';
        } else {
            document.getElementById('feed-navigation').style.display = 'none';
        }
    }

    checkViewport() {
        this.updateVisibleFeeds();
    }
}

const feedManager = new FeedManager();