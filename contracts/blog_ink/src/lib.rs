#![no_std]

use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, Address, Env, String, Symbol,
};

#[contract]
pub struct BlogInkContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Post {
    pub author: Address,
    pub post_id: Symbol,
    pub title: String,
    pub content_hash: String,
    pub total_tips: i128,
    pub tip_count: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Post(Symbol),
    AuthorEarnings(Address),
    ReaderTip(Symbol, Address),
    TotalPosts,
    TotalTips,
}

#[contractevent(data_format = "vec")]
pub struct PostPublished {
    #[topic]
    pub author: Address,
    #[topic]
    pub post_id: Symbol,
    pub title: String,
    pub timestamp: u64,
}

#[contractevent(data_format = "vec")]
pub struct TipSent {
    #[topic]
    pub reader: Address,
    #[topic]
    pub post_id: Symbol,
    pub author: Address,
    pub amount: i128,
    pub total_tips: i128,
    pub timestamp: u64,
}

#[contractimpl]
impl BlogInkContract {
    pub fn publish_post(
        env: Env,
        author: Address,
        post_id: Symbol,
        title: String,
        content_hash: String,
    ) -> Post {
        author.require_auth();

        let post_key = DataKey::Post(post_id.clone());

        if env.storage().persistent().has(&post_key) {
            panic!("post already exists");
        }

        let now = env.ledger().timestamp();

        let post = Post {
            author: author.clone(),
            post_id: post_id.clone(),
            title: title.clone(),
            content_hash,
            total_tips: 0,
            tip_count: 0,
            created_at: now,
            updated_at: now,
        };

        env.storage().persistent().set(&post_key, &post);

        let total_posts = Self::get_total_posts(env.clone());
        env.storage()
            .instance()
            .set(&DataKey::TotalPosts, &(total_posts + 1));

        PostPublished {
            author,
            post_id,
            title,
            timestamp: now,
        }
        .publish(&env);

        post
    }

    pub fn tip_post(env: Env, reader: Address, post_id: Symbol, amount: i128) -> Post {
        reader.require_auth();

        if amount <= 0 {
            panic!("tip amount must be positive");
        }

        let post_key = DataKey::Post(post_id.clone());

        let mut post: Post = env
            .storage()
            .persistent()
            .get(&post_key)
            .unwrap_or_else(|| panic!("post not found"));

        post.total_tips += amount;
        post.tip_count += 1;
        post.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&post_key, &post);

        let reader_tip_key = DataKey::ReaderTip(post_id.clone(), reader.clone());
        let previous_reader_tip: i128 =
            env.storage().persistent().get(&reader_tip_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&reader_tip_key, &(previous_reader_tip + amount));

        let author_earnings_key = DataKey::AuthorEarnings(post.author.clone());
        let previous_author_earnings: i128 = env
            .storage()
            .persistent()
            .get(&author_earnings_key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&author_earnings_key, &(previous_author_earnings + amount));

        let total_tips = Self::get_total_tips(env.clone());
        env.storage()
            .instance()
            .set(&DataKey::TotalTips, &(total_tips + amount));

        TipSent {
            reader,
            post_id,
            author: post.author.clone(),
            amount,
            total_tips: post.total_tips,
            timestamp: post.updated_at,
        }
        .publish(&env);

        post
    }

    pub fn get_post(env: Env, post_id: Symbol) -> Option<Post> {
        env.storage().persistent().get(&DataKey::Post(post_id))
    }

    pub fn get_reader_tip(env: Env, post_id: Symbol, reader: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::ReaderTip(post_id, reader))
            .unwrap_or(0)
    }

    pub fn get_author_earnings(env: Env, author: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::AuthorEarnings(author))
            .unwrap_or(0)
    }

    pub fn get_total_posts(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalPosts)
            .unwrap_or(0)
    }

    pub fn get_total_tips(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalTips)
            .unwrap_or(0)
    }
}

mod test;
