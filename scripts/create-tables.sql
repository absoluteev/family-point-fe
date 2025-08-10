-- Create families table
CREATE TABLE families (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'kid', 'admin')),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('obligation', 'nice_to_have', 'forbidden')),
  points INTEGER NOT NULL,
  requires_approval BOOLEAN DEFAULT false,
  deadline TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create point entries table
CREATE TABLE point_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(user_id),
  activity_id UUID REFERENCES activities(id),
  reward_id UUID REFERENCES rewards(id),
  points INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES user_profiles(user_id),
  notes TEXT
);

-- Create reward redemptions table
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(user_id),
  reward_id UUID NOT NULL REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES user_profiles(user_id),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families
CREATE POLICY "Users can view their own family" ON families
  FOR SELECT USING (
    id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their family" ON families
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    id IN (
      SELECT family_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- RLS Policies for user_profiles
CREATE POLICY "Users can view profiles in their family" ON user_profiles
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Parents can manage kids in their family" ON user_profiles
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- RLS Policies for activities
CREATE POLICY "Family members can view activities" ON activities
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage activities" ON activities
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- RLS Policies for rewards
CREATE POLICY "Family members can view rewards" ON rewards
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage rewards" ON rewards
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- RLS Policies for point_entries
CREATE POLICY "Family members can view point entries" ON point_entries
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Kids can insert their own entries" ON point_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage all entries" ON point_entries
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- RLS Policies for reward_redemptions
CREATE POLICY "Family members can view redemptions" ON reward_redemptions
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Kids can request redemptions" ON reward_redemptions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    family_id IN (
      SELECT family_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage redemptions" ON reward_redemptions
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_family_id ON user_profiles(family_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_activities_family_id ON activities(family_id);
CREATE INDEX idx_rewards_family_id ON rewards(family_id);
CREATE INDEX idx_point_entries_family_id ON point_entries(family_id);
CREATE INDEX idx_point_entries_user_id ON point_entries(user_id);
CREATE INDEX idx_reward_redemptions_family_id ON reward_redemptions(family_id);
CREATE INDEX idx_reward_redemptions_user_id ON reward_redemptions(user_id);
