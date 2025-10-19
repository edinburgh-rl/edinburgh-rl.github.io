# University of Edinburgh MARBLE website
This is the code for the website, written in [Next.js](https://nextjs.org/). The website uses [Bulma](https://bulma.io/) for styling.

## Running locally
Before you run locally, ensure that you have installed **Node 22**. Then, install the required dependencies by running:
```
npm i
```
Once all the dependencies have been installed, you can run the local dev version by running the following command:
```
npm run dev
```
This will spin up a local development server that will service the website while developing. You can usually access the local version of the website at [http://localhost:3000](http://localhost:3000) (the terminal will give you the url to access the website).

## Building the static website
To build the static website, run
```
npm run build
```
This will build the static website, after that you can test it by serving it via
```
npx serve out
```
You will not need to do this most of the time. It is best to test the website under the local dev environment as it updates the pages as they are updated. However, if you want to test the end results (how it would appear on the web after publishing via the GitHub Actions) then you may use that.

**Note**: there is a `postbuild` script that runs after the website is build which would update the sitemap used for indexing the website. The sitemap is built via the [`next-sitemap`](https://github.com/iamvishnusankar/next-sitemap) package. The settings can be found inside the `next-sitemap-config.js` file. Note that `/blog/example` is excluded from the sitemap as this is an example blog demonstrating how to write an article.

## Reading group sessions
To add information about an upcoming reading group session, please add a new markdown file under the `/data/reading_group` folder. The information about the reading group is added as markdown front matter. Currently, the supported fields are:
| **Field** | **Type** | **Description**                                                                                                |
|-----------|----------|----------------------------------------------------------------------------------------------------------------|
| datetime  | string   | The date and time of the reading group session. It is in the format yyyy-mm-dd HH:mm. It follows London time.  |
| speakers  | string   | Session speakers. Could separate speaker names via commas or "and"                                             |
| title     | string   | Title of the talk                                                                                              |
| abstract  | string   | Abstract of the talk. Used to provide information about the topic                                              |
| bio       | string   | Information about the speakers                                                                                 |
| links     | list     | (Optional) List of links used to provide external references. See an example of the formatting below.          |

Example of a markdown file for an upcoming session:
```markdown
---
datetime: 2025-10-15 14:00
speakers: John Smith and Nick Johnson
title: An exciting RL topic
abstract: RL is cool
bio: John Smith and Nick Johnson are lecturers at the RL university
links:
    - href: https://example.com
      name: Paper
    - href: https://example.com
      name: Website
---
```
Information about the reading group sessions and how they are displayed on the website:
- If there are no markdown files with datetime that is after the datetime at the moment when the website is generated (when the GitHub Actions pipeline is run), then the webpage will display a message that there are no upcoming sessions
- Markdown files of sessions that have passed are not removed automatically. This is a feature that can be added later on, but for now these can be removed manually with a commit
- When there are multiple markdown files of upcoming sessions, only information about the next session is displayed. When the website is generated, the datetimes of all sessions are sorted to determine which session is next
- The speaker field is a string which allows multiple speakers to be listed
- The links field is optional. As many links can be added as needed, they are automatically separated via comma in the front-end. Use links to add references to external resources for the talk - e.g. the paper of the topic, a research lab website, etc.
- Use the bio field to add information about the speaker(s). Normally, the speaker(s) can provide that.

An example markdown file called `example.md` can be found under the `/data/reading_group` which provides an easy way to create a new session markdown file.

## Blog articles
To write a blog article, you must create a `.mdx` file and add it under the `/data/blog` folder. [MDX](https://mdxjs.com/) is an extension to the standard markdown and allows for the addition of React components. Each article file includes front matter and content. The fron matter has the following fields:
| **Field**   | **Type**     | **Description**                                                                                                                                                           |
|-------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| title       | string       | The title of the article. It is displayed both on the blog and the article pages.                                                                                         |
| author      | string       | The name of the author(s). This is displayed under the title on both the blog and article pages.                                                                          |
| date        | string       | Publishing date of the article. It is displayed under the title on the article page and under the author on the blog page.                                                |
| description | string       | Description of the article. This is used as metadata for the page which helps with the indexing and discoverability on the internet.                                      |
| keywords    | list[string] | List of strings which are used as keywords for the metadata to help with indexing and discoverability.                                                                    |
| picture     | string       | (Optional) Link to an image to be used on the card in the blog page. If not provided, the default image will be used which is found in `/public/images/blog/default.png`. Please check information below about adding images to articles  |
| hide        | boolean      | (Optional) When this field is provided and it is set to true, the article is not shown on the blog page and searching it directly via URL will return the Error 404 page. |

Notes on the front matter:
- The `date` field is used for displaying the publishing date and for sorting the articles on the blog page. Articles are sorted in descending date of publication, meaning that the most recent article will be shown first.
- The description is not shown anywhere on the page, it is only used to improve the search engine results. It is always a good idea to add one.
- The keywords are not displayed anywhere on the page, they are only used to improve the search engine results. It is always a good idea to add these.
- The `hide` opton provides a way to hide articles that are currently being written. However, note that while the article will not appear on the webpage and could not be found via URL search, the content of the article will still appear in the GitHub repository which is public, so avoid putting anything sensitive in the article when hidden that you do not want to be found on the internet. When writing an article, while running locally, you can set this to false and the artcle will be displayed on your local version of the website, which allows you to see the end results. Once you are ready for the article to be published, remove this field from the file or set it to false before commiting.

The content part of the MDX file contains the markdown content - the article itself. You can use standard markdown features from the GitHub markdown files. These include images, tables, math equations, code blocks.
An example of an article showing these features can be found in `/data/blog/example.mdx`. 

As we are using MDX, we can add React components in the markdown content. Currently, the following components have been added:
| **Component** | **Description**                                                                             |
|---------------|---------------------------------------------------------------------------------------------|
| Centered      | Used to centre content on the markdown page. For example, you can use it to centre a table. |
| WithCaption   | Used to add a caption, e.g. to a table.                                                     |

If you want to create new components, please add these under the `/components/blog` folder and make sure to include them in the `/app/blog/[slug]/page.tsx` file by adding them under the components object.

A tiny example of an MDX file is as follows:
```mdx
---
title: Example article using MDX for content
author: John Smith
date: 2025-10-05
description: An article demonstrating how MDX can be used to write articles as part of our blog.
keywords: [MDX, blog article]
hide: false
---

# Section 1 title
Some content in section one

## Subsection 1 title
Some extra content

Here is an unordered list:
- item 1
- item 2

Here is an example of a table with a caption:
<WithCaption caption="Table 1">
| Tables   |      Are      |  Cool |
|----------|:-------------:|------:|
| col 1 is |  left-aligned | $1600 |
| col 2 is |    centered   |   $12 |
| col 3 is | right-aligned |    $1 |
</WithCaption>

And here is an example with a centered table without a caption:
<Centered>
| Tables   |      Are      |  Cool |
|----------|:-------------:|------:|
| col 1 is |  left-aligned | $1600 |
| col 2 is |    centered   |   $12 |
| col 3 is | right-aligned |    $1 |
</Centered>
```
**Note**:  In front of all headings the # symbol is added with a link to that heading. This allows people to copy the URL to that heading which is useful for quickly sharing a specific part of the article.

More examples of the markdown fields can be found in the example file.

### Information about adding images to articles
If you want to add images to articles, including an image for the card on the blog page, the follow these steps:
- Create a new folder under `/public/images/blog` and name it after your article.
- Place all images in the folder you created.
- To add an image as the blog card image, include it in the front matter of the MDX file:
  - `picture: /images/blog/example/example.png` assuming that the article name is "example" and the image file is "example.png"
- To add an image inside of the MDX file to be displayed in the article, you can reference the image as `/images/blog/example/example.png` when using the `<img>` tag inside of the MDX content. 

## People page
To add member to the people page, please add a new markdown file under the `/data/people` folder and name it as the person's name. The data about the person is stored as front matter inside of this markdown file. The format is as follows:
| **Field**    | **Type** | **Description**                                               |
|--------------|----------|---------------------------------------------------------------|
| name         | string   | Name of the person                                            |
| type         | string   | Type of membership. Please check below the type of membership |
| occupation   | string   | Position of the individual. E.g. PhD Student, Informatics     |
| photoUrl | string   | Name of the photo. E.g. `name.png`                            |
| website      | string   | (Optional) URL to personal website                            |
| github       | string   | (Optional) URL to GitHub page                                 |
| x            | string   | (Optional) URL to x.com page                                  |
| bluesky      | string   | (Optional) URL to Bluesky page                                |
| linkedin     | string   | (Optional) URL to LinkedIn page                               |
| scholar      | string   | (Optional) URL to Google Scholar page                         |

Example of a markdown front matter:
```markdown
---
name: John Smith
type: Members
occupation: PhD Student, Informatics
photoUrl: johnsmith.png
website: https://example.com/
github: https://github.com/
x: https://x.com/
bluesky: https://bsky.app/
linkedin: https://linkedin.com/
scholar: https://scholar.google.com/
---
```
The following membership types can be added to `type` field:
- `Members` - a regular member who is a current student at the University of Edinburgh
- `Associate Members` - a current member of the group who is not a student at the University of Edinburgh. Can be used for visiting students/researchers
- `Advisors` - used for members who are advisors, including faculty members and external advisors
- `Alumni` - a former member of the group who was a student at the University of Edinburgh
- `Alumni Associates` - a former member of the group who was not a student at the University of Edinburgh

Membership could be updated manually as needed.

### Adding a member photo
To add a photo of a member, please do the following steps:
- Ensure that the photo is a square photo (has a 1:1 ratio) and that the member's face is in the centre so that the resulting photo on the website is best
- Name the photo according to the name of the person
- Add the photo to the `/public/photos/people`
- Provide the photo to the `photoUrl` field in the front matter as follows:
  - `photoUrl: name_of_person.jpg`
- Please note that the file extension is capital sensitive so `.jpg` and `.JPG` are not the same

## Information about the website
Some extra information about the website:
- When a commit is made and pushed to the main branch, GitHub Actions will execute a pipeline that will generate the static content of the website.
- Apart from manual pushing, the website has a scheduled cron job that is used to automatically update the page every day. Currently, this feature allows the next reading group session to be updated automatically
- Always run locally via `npm run dev` to verify that everything looks good before commiting to the main branch. If working on a new feature, please use a different branch.
- The website is developed using TypeScript which adds typing to JavaScript. Eslint is used for verifying that all the formatting and types are correct. It is possible that the website runs under the local dev environment but fails to build because the eslint rules are not met. The most commont problem happens when a type is set to `any`. Please, run `npm run build` to verify that the wesbite will build without errors. Note that when you use this command, the `robots.txt` and `sitemap.xml` files will be generated. Make sure you do not commit them to the repository by deleting them.
