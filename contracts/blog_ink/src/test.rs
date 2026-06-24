#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, String};

fn setup() -> (Env, BlogInkContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BlogInkContract, ());
    let client = BlogInkContractClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let reader = Address::generate(&env);

    (env, client, author, reader)
}

#[test]
fn publish_post_stores_blog_metadata() {
    let (env, client, author, _) = setup();

    let post_id = symbol_short!("post1");
    let title = String::from_str(&env, "First blog");
    let content_hash = String::from_str(&env, "ipfs://blog-ink-post-1");

    let post = client.publish_post(&author, &post_id, &title, &content_hash);

    assert_eq!(post.author, author);
    assert_eq!(post.post_id, post_id);
    assert_eq!(post.title, title);
    assert_eq!(post.content_hash, content_hash);
    assert_eq!(post.total_tips, 0);
    assert_eq!(post.tip_count, 0);
    assert_eq!(client.get_total_posts(), 1);
}

#[test]
fn tip_post_updates_post_totals_and_author_earnings() {
    let (env, client, author, reader) = setup();

    let post_id = symbol_short!("post2");
    let title = String::from_str(&env, "Stellar notes");
    let content_hash = String::from_str(&env, "ipfs://blog-ink-post-2");

    client.publish_post(&author, &post_id, &title, &content_hash);

    let updated_post = client.tip_post(&reader, &post_id, &25_i128);

    assert_eq!(updated_post.total_tips, 25);
    assert_eq!(updated_post.tip_count, 1);
    assert_eq!(client.get_reader_tip(&post_id, &reader), 25);
    assert_eq!(client.get_author_earnings(&author), 25);
    assert_eq!(client.get_total_tips(), 25);
}

#[test]
fn multiple_tips_accumulate_correctly() {
    let (env, client, author, reader) = setup();

    let post_id = symbol_short!("post3");
    let title = String::from_str(&env, "Creator economy");
    let content_hash = String::from_str(&env, "ipfs://blog-ink-post-3");

    client.publish_post(&author, &post_id, &title, &content_hash);

    client.tip_post(&reader, &post_id, &10_i128);
    let updated_post = client.tip_post(&reader, &post_id, &15_i128);

    assert_eq!(updated_post.total_tips, 25);
    assert_eq!(updated_post.tip_count, 2);
    assert_eq!(client.get_reader_tip(&post_id, &reader), 25);
    assert_eq!(client.get_author_earnings(&author), 25);
    assert_eq!(client.get_total_tips(), 25);
}

#[test]
#[should_panic]
fn cannot_publish_duplicate_post_id() {
    let (env, client, author, _) = setup();

    let post_id = symbol_short!("post4");
    let title = String::from_str(&env, "Duplicate post");
    let content_hash = String::from_str(&env, "ipfs://blog-ink-post-4");

    client.publish_post(&author, &post_id, &title, &content_hash);
    client.publish_post(&author, &post_id, &title, &content_hash);
}

#[test]
#[should_panic]
fn cannot_tip_missing_post() {
    let (_, client, _, reader) = setup();

    let missing_post_id = symbol_short!("missing");

    client.tip_post(&reader, &missing_post_id, &10_i128);
}

#[test]
#[should_panic]
fn cannot_tip_zero_or_negative_amount() {
    let (env, client, author, reader) = setup();

    let post_id = symbol_short!("post5");
    let title = String::from_str(&env, "Invalid tip");
    let content_hash = String::from_str(&env, "ipfs://blog-ink-post-5");

    client.publish_post(&author, &post_id, &title, &content_hash);
    client.tip_post(&reader, &post_id, &0_i128);
}
